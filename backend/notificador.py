import time
import psycopg2
import hashlib
import json
from pywebpush import webpush, WebPushException
from config import *


def conectar_pg():
    return psycopg2.connect(**PG_CONFIG)


def enviar_push(titulo, corpo, url="/"):
    try:
        with open("subscriptions.json", "r") as f:
            subscriptions = json.load(f)
    except FileNotFoundError:
        print("⚠ Nenhuma inscrição encontrada (subscriptions.json não existe).")
        return

    payload = json.dumps({
        "title": titulo,
        "body": corpo,
        "url": url
    })

    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": "mailto:admin@meusistema.com"}
            )
            print("✅ Push enviado para um cliente")
        except WebPushException as e:
            print(f"❌ Erro ao enviar push: {e}")


def calcular_hash_tabela():
    conn = conectar_pg()
    cursor = conn.cursor()

    # Estrutura da tabela
    cursor.execute(f"""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '{TABLE_NAME}'
        ORDER BY ordinal_position;
    """)
    estrutura = cursor.fetchall()

    # Dados da tabela
    cursor.execute(f"SELECT * FROM {TABLE_NAME} ORDER BY id;")
    dados = cursor.fetchall()

    cursor.close()
    conn.close()

    # Hash da estrutura + dados
    m = hashlib.sha256()
    m.update(str(estrutura).encode())
    m.update(str(dados).encode())
    return m.hexdigest()


def monitorar_tabela():
    hash_atual = calcular_hash_tabela()
    try:
        while True:
            novo_hash = calcular_hash_tabela()
            if novo_hash != hash_atual:
                try:
                    enviar_push(
                        titulo="🚨 Alteração no Banco",
                        corpo=f"A tabela {TABLE_NAME} foi modificada!",
                        url=f"/{TABLE_NAME}"
                    )
                except Exception as e:
                    print(f"Erro ao enviar push: {e}")
                hash_atual = novo_hash
            time.sleep(3)
    except KeyboardInterrupt:
        print("\nMonitoramento encerrado pelo usuário.")


if __name__ == "__main__":
    monitorar_tabela()