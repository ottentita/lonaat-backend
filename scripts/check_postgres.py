import sys
try:
    import psycopg2
except Exception as e:
    print('ERROR: psycopg2 not installed or import failed:', e)
    sys.exit(2)

uri = 'postgresql://postgres:hHtqKNTVckxpxyJKFVGFXeUUgYmCuXSw@nozomi.proxy.rlwy.net:21973/postgres'
try:
    conn = psycopg2.connect(uri)
    cur = conn.cursor()
    cur.execute("SELECT datname FROM pg_database ORDER BY datname;")
    rows = cur.fetchall()
    for r in rows:
        print(r[0])
    cur.close()
    conn.close()
except Exception as e:
    print('ERROR: connection/listing failed:', e)
    sys.exit(3)
