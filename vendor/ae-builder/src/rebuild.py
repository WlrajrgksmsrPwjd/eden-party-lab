d='/tmp/claude-0/work/'
a=open(d+'app.js').read(); sh=open(d+'app_shot.js').read()
i=a.index('const SHOT_EX_IMG'); j=a.index(sh[:200]); ex=a[i:j]
J=lambda fs:'\n'.join(open(d+f).read().rstrip('\n') for f in fs)
open(d+'app.js','w').write(J(['app_top.js','app_cus.js','app_mid.js','app_bot.js'])+'\n'+ex+J(['app_shot.js','app_opt.js','app_rev.js','app_share.js'])+'\n')
