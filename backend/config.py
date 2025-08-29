from dotenv import load_dotenv
import os

# Carrega variáveis do .env
load_dotenv()

# Configurações do PostgreSQL
PG_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT")),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "dbname": os.getenv("DB_NAME")
}

# Nome da tabela a monitorar
TABLE_NAME = os.getenv("TABLE_NAME")

# Configurações do Web Push
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
AUTH_TOKEN = os.getenv("AUTH_TOKEN")  # Token de autenticação simples
PORT = int(os.getenv("PORT", 3000))   # Porta padrão 3000