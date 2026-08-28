#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: $0 <externo|interno> <comando-clasp> [argumentos...]" >&2
  echo "Exemplo: $0 externo status" >&2
  exit 2
fi

alvo="$1"
comando="$2"
shift 2

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"

case "$alvo" in
  externo)
    perfil="pessoal"
    projeto="$project_dir/.clasp.externo.json"
    ;;
  interno)
    perfil="institucional"
    projeto="$project_dir/.clasp.interno.json"
    ;;
  *)
    echo "Alvo inválido: $alvo. Use externo ou interno." >&2
    exit 2
    ;;
esac

case "$comando" in
  status|push|pull|deploy|redeploy|deployments|versions|version|run|open-script|open-web-app)
    ;;
  *)
    echo "Comando não permitido por este atalho: $comando" >&2
    echo "Permitidos: status, push, pull, deploy, redeploy, deployments, versions, version, run, open-script, open-web-app" >&2
    exit 2
    ;;
esac

if [ ! -f "$projeto" ]; then
  echo "Configuração ausente: $projeto" >&2
  echo "Copie o arquivo .example correspondente e informe o scriptId correto." >&2
  exit 1
fi

exec clasp --user "$perfil" --project "$projeto" "$comando" "$@"
