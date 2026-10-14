import json
t=open('template.html').read(); e=open('engine.js').read(); a=open('app.js').read()
w=json.load(open('wp.json')); ab=json.load(open('ab.json'))
for x in w: x.pop('lv',None)
gl=json.load(open('gl.json'))
data=json.dumps(dict(w=w,armor=ab['armor'],badges=ab['badges'],gl=gl['gl'],ores=gl['ores']),ensure_ascii=False,separators=(',',':'))
a=a.replace('/*DATA*/',data)
t=t.replace('/*ENGINE*/',e).replace('<script src="app.js"></script>','<script>'+a+'</script>')
open('out/ae-weapon-compare.html','w').write(t); print(len(t))
