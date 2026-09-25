"""Stream a bounded, reproducible CC0 Lichess selection; Python 3.14 + python-chess."""
import csv, io, json, hashlib, urllib.request, datetime
from compression import zstd
from collections import Counter
from pathlib import Path
import chess, chess.pgn

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'src'/'content'
URL='https://database.lichess.org/lichess_db_puzzle.csv.zst'
TARGETS={'first':8000,'beginner':10000,'intermediate':8000,'advanced':4000}
def level(r): return 'first' if r<1000 else 'beginner' if r<1500 else 'intermediate' if r<2000 else 'advanced'
def get(url): return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ChessHome-personal-library/1.1'}),timeout=90)
selected=[];seen=set();counts=Counter();themes=Counter();scanned=0
if (OUT/'library-puzzles.json').exists():
    selected=json.loads((OUT/'library-puzzles.json').read_text(encoding='utf-8'))
    for p in selected:
        seen.add(' '.join(p['fen'].split()[:4]));counts[level(p['rating'])]+=1;themes.update(p['themes'])
if len(selected)<sum(TARGETS.values()):
    with get(URL) as response, zstd.ZstdFile(response) as data:
        rows=csv.DictReader(io.TextIOWrapper(data,encoding='utf-8'))
        for row in rows:
            scanned+=1
            if scanned>2000000:raise RuntimeError("Selection exceeded bounded scan")
            rating=int(row['Rating']); group=level(rating)
            if counts[group]>=TARGETS[group] or int(row['Popularity'])<80 or int(row['NbPlays'])<500 or int(row['RatingDeviation'])>100: continue
            board=chess.Board(row['FEN']); moves=row['Moves'].split()
            if len(moves)<2:continue
            setup=chess.Move.from_uci(moves[0])
            if setup not in board.legal_moves:raise ValueError(row['PuzzleId'])
            board.push(setup);fen=board.fen();key=' '.join(fen.split()[:4])
            if key in seen:continue
            for u in moves[1:]:
                move=chess.Move.from_uci(u)
                if move not in board.legal_moves:raise ValueError(row['PuzzleId'])
                board.push(move)
            tags=row['Themes'].split()
            if any(t.startswith('mateIn') for t in tags) and not board.is_checkmate():raise ValueError('Expected mate '+row['PuzzleId'])
            selected.append({'id':'lichess_'+row['PuzzleId'],'fen':fen,'line':moves[1:],'rating':rating,'themes':tags,'popularity':int(row['Popularity']),'plays':int(row['NbPlays']),'url':row['GameUrl'],'opening':row.get('OpeningTags','')})
            seen.add(key);counts[group]+=1;themes.update(tags)
            if len(selected)%1000==0:print(json.dumps({'puzzles':len(selected),'levels':dict(counts),'scanned':scanned}),flush=True)
            if len(selected)==sum(TARGETS.values()):break
            if scanned>2000000:raise RuntimeError('Selection exceeded bounded scan')
if len(selected)!=sum(TARGETS.values()):raise RuntimeError('Incomplete selection')
payload=json.dumps(selected,separators=(',',':'),ensure_ascii=False)
(OUT/'library-puzzles.json').write_text(payload,encoding='utf-8')
openings=[];opening_sources=[]
for volume in 'abcde':
    url=f'https://raw.githubusercontent.com/lichess-org/chess-openings/master/{volume}.tsv'
    raw=get(url).read();opening_sources.append({'url':url,'sha256':hashlib.sha256(raw).hexdigest()})
    for row in csv.DictReader(io.StringIO(raw.decode()),delimiter='\t'):
        game=chess.pgn.read_game(io.StringIO(row['pgn']))
        if game.errors:raise ValueError(row['name'])
        line=[m.uci() for m in game.mainline_moves()]
        oid=hashlib.sha256((row['eco']+'|'+row['name']+'|'+row['pgn']).encode()).hexdigest()[:16]
        openings.append({'id':'opening_'+oid,'eco':row['eco'],'name':row['name'],'pgn':row['pgn'],'line':line})
(OUT/'openings.json').write_text(json.dumps(openings,separators=(',',':'),ensure_ascii=False),encoding='utf-8')
manifest={'downloadedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'license':'CC0-1.0','puzzleSource':URL,'puzzleSha256':hashlib.sha256(payload.encode()).hexdigest(),'puzzles':len(selected),'levels':dict(counts),'themes':dict(themes),'scanned':scanned,'selection':'first unique positions meeting popularity>=80, plays>=500, deviation<=100 within each rating band; all continuations legally replayed; opponent setup move applied','openings':len(openings),'openingSources':opening_sources}
(OUT/'library-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'done':True,'puzzles':len(selected),'openings':len(openings),'endgames':themes['endgame'],'mates':themes['mate']}),flush=True)
