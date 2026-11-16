# -*- coding: utf-8 -*-
"""Unreal Editor'a terminalden Python komutu gönderir (MetaHuman hasta üretim hattı).

Açık duran Unreal Editor'daki Python eklentisinin "uzaktan yürütme" kanalına
bağlanır (yalnız bu bilgisayar: 127.0.0.1), komutu ya da dosyayı editörün
İÇİNDE çalıştırır, çıktısını basar. Editörü ajan olarak sürmenin köprüsü.

Ön koşul:
  - Proje: C:\\UEP\\MediSimHasta (Config/DefaultEngine.ini içinde bRemoteExecution=True)
  - Editör açık:  "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe" C:\\UEP\\MediSimHasta\\MediSimHasta.uproject

Kullanım:
  python scripts/ue/ue_py.py --ping                 # editör dinliyor mu
  python scripts/ue/ue_py.py -c "print(unreal.SystemLibrary.get_engine_version())"
  python scripts/ue/ue_py.py -f scripts/ue/bir_betik.py
  python scripts/ue/ue_py.py --eval "1 + 1"          # tek ifade, sonucu döndürür

Çıkış kodu: 0 başarı · 1 komut hata verdi · 2 editör bulunamadı.
"""
import argparse
import os
import sys
import time

ENGINE_PY = os.environ.get(
    "UE_PYTHON_DIR",
    r"C:\Program Files\Epic Games\UE_5.8\Engine\Plugins\Experimental\PythonScriptPlugin\Content\Python",
)


def _load_client():
    if not os.path.isfile(os.path.join(ENGINE_PY, "remote_execution.py")):
        print("HATA: remote_execution.py bulunamadı: " + ENGINE_PY, file=sys.stderr)
        sys.exit(2)
    sys.path.insert(0, ENGINE_PY)
    import remote_execution  # noqa: E402  (motorla gelen istemci)

    return remote_execution


def _connect(rx, wait_s):
    client = rx.RemoteExecution()
    client.start()
    deadline = time.time() + wait_s
    while time.time() < deadline and not client.remote_nodes:
        time.sleep(0.25)
    nodes = client.remote_nodes
    if not nodes:
        client.stop()
        return None, None
    return client, nodes[0]


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="Unreal Editor'a Python komutu gönder")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("-c", "--command", help="çalıştırılacak Python kodu (çok satır olabilir)")
    g.add_argument("-f", "--file", help="editörde çalıştırılacak .py dosyası")
    g.add_argument("--eval", help="tek ifade değerlendir, sonucu yaz")
    g.add_argument("--ping", action="store_true", help="yalnız editörü bul")
    ap.add_argument("--wait", type=float, default=6.0, help="editörü arama süresi (sn)")
    args = ap.parse_args()

    rx = _load_client()
    client, node = _connect(rx, args.wait)
    if client is None:
        print("Editör bulunamadı (açık mı? bRemoteExecution=True mi?)", file=sys.stderr)
        return 2
    try:
        if args.ping:
            print("editör bulundu: %s | %s | %s" % (
                node.get("project_name"), node.get("engine_version"), node.get("node_id")))
            return 0
        client.open_command_connection(node["node_id"])
        if args.eval is not None:
            res = client.run_command(args.eval, unattended=True, exec_mode=rx.MODE_EVAL_STATEMENT)
        elif args.file:
            path = os.path.abspath(args.file).replace("\\", "/")
            res = client.run_command(path, unattended=True, exec_mode=rx.MODE_EXEC_FILE)
        else:
            res = client.run_command(args.command, unattended=True, exec_mode=rx.MODE_EXEC_FILE)
        for line in res.get("output", []) or []:
            text = (line.get("output") or "").rstrip("\n")
            kind = line.get("type", "Info")
            print(("[%s] " % kind if kind != "Info" else "") + text)
        if args.eval is not None or not res.get("success"):
            print("sonuç: %s" % res.get("result"))
        return 0 if res.get("success") else 1
    finally:
        client.stop()


if __name__ == "__main__":
    sys.exit(main())
