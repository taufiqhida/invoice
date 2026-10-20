#!/bin/sh
# Menyiapkan Laravel otomatis saat container menyala: kunci aplikasi, migrasi, dan akun pemilik.
set -e
cd /var/www/html

mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
chown -R www-data:www-data storage bootstrap/cache

# APP_KEY: pakai dari .env bila ada; kalau kosong, buat sekali dan simpan di volume storage.
if [ -z "$APP_KEY" ]; then
  KEY_FILE=storage/app/.app_key
  if [ ! -s "$KEY_FILE" ]; then
    php artisan key:generate --show > "$KEY_FILE"
    echo "[entrypoint] APP_KEY baru dibuat dan disimpan di volume storage."
  fi
  export APP_KEY="$(cat "$KEY_FILE")"
fi

# Hanya jalankan tugas setup saat menjalankan php-fpm (bukan perintah artisan sekali jalan).
if [ "$1" = "php-fpm" ]; then
  php artisan storage:link --force >/dev/null 2>&1 || true
  php artisan migrate --force

  # Akun pemilik (tidak ada pendaftaran publik) — dibuat sekali bila OWNER_EMAIL & OWNER_PASSWORD diisi.
  if [ -n "$OWNER_EMAIL" ] && [ -n "$OWNER_PASSWORD" ]; then
    php artisan tinker --execute="\$u = \App\Models\User::firstOrCreate(['email' => getenv('OWNER_EMAIL')], ['name' => getenv('OWNER_NAME') ?: 'Pemilik Toko', 'password' => bcrypt(getenv('OWNER_PASSWORD'))]);" || true
  fi

  php artisan config:cache
  php artisan route:cache || true
fi

exec "$@"
