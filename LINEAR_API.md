# share-paint Linear API Playbook (MCP 대체)

MCP 도구 대신 API 토큰으로 Linear 이슈를 직접 조회할 때 쓰는 방식.

## 1) 인증
- `~/.openclaw/openclaw.json`의 `skills.entries.linear_mcp.env.LINEAR_ACCESS_TOKEN`를 사용
- `Authorization` 헤더에 토큰 그대로 넣기

```bash
curl -H "Authorization: $LINEAR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d '{"query":"query { viewer { id name email } }"}'
```

## 2) 프로젝트/팀/이슈 조회 스크립트

아래 Python 스크립트는 `Paint-share` 팀의 이슈를 받아서 상태별로 정렬해 출력합니다.

```bash
python3 - <<'PY'
import json, urllib.request

auth='YOUR_LINEAR_ACCESS_TOKEN'   # 또는 환경변수에서 읽어도 됨
team_key='Paint-share'
url='https://api.linear.app/graphql'

# 팀(=team) 찾기
q='''query {
  teams { nodes { id name key } }
}'''

def gql(query):
    req=urllib.request.Request(url, data=json.dumps({'query':query}).encode(), headers={
        'Authorization': auth,
        'Content-Type': 'application/json'
    })
    with urllib.request.urlopen(req) as r:
        data=json.loads(r.read().decode())
    if 'errors' in data:
        raise RuntimeError(data['errors'])
    return data['data']

teams=gql(q)['teams']['nodes']
team=next((t for t in teams if t['name']==team_key or t['key']==team_key), None)
if not team:
    raise SystemExit('team not found')

after=None
all=[]
while True:
    q2=f'''query {{
  team(id: "{team['id']}") {{
    issues(first: 100{', after: "%s"' % after if after else ''}) {{
      pageInfo {{ hasNextPage endCursor }}
      nodes {{ identifier title state {{ name }} priorityLabel assignee {{ name }} url }}
    }}
  }}
}}'''
    d=gql(q2)['team']['issues']
    all.extend(d['nodes'])
    if not d['pageInfo']['hasNextPage']:
        break
    after=d['pageInfo']['endCursor']

for st in ['In Progress','Todo','Backlog','Done']:
    arr=[x for x in all if x['state']['name']==st]
    print(f"\n== {st} ({len(arr)}) ==")
    for i in arr:
        owner=(i['assignee'] or {}).get('name') or '-'
        print(f"{i['identifier']} [{i['priorityLabel']}] {i['title']} | owner={owner} | {i['url']}")
PY
```

## 3) 최신 조회 결과 (2026-02-18, API 직접 조회)

총 이슈: 56

### In Progress
- (없음)

### Todo
- PAI-4, PAI-3, PAI-2, PAI-1 (초기 세팅 계열)

### Backlog (42개)
- PAI-46 ~ PAI-7 (PS-E1~E8 우선순위군)

### Done (10개)
- PAI-56 ~ PAI-47 (최근 보안/DB/API-RLS 정합성 작업)

> 원하면 내가 다음 단계에서 이 목록을 **PM-VALIDATION-BOARD**에 넣어
> 현재 스프린트 우선순위 기준으로 바로 다시 정렬해줄게.
