# -*- coding: utf-8 -*-
"""一次部署游戏厅 + 跑酷 + 大冒险"""
import paramiko, os
B = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test'
PASS = open(os.path.join(B, 'sshpass.txt'), encoding='utf-8').read().strip()
ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.156.177.115', username='ubuntu', password=PASS, timeout=30)
sftp = ssh.open_sftp()

FILES = [
    (r'game\index.html',            '/tmp/g_hub.html', '/var/www/game/index.html'),
    (r'game\style.css',             '/tmp/g_hub.css',  '/var/www/game/style.css'),
    (r'game\runner\index.html',     '/tmp/g_r.html',   '/var/www/game/runner/index.html'),
    (r'game\runner\game.js',        '/tmp/g_r.js',     '/var/www/game/runner/game.js'),
    (r'game\runner\style.css',      '/tmp/g_r.css',    '/var/www/game/runner/style.css'),
    (r'game\adventure\index.html',  '/tmp/g_a.html',   '/var/www/game/adventure/index.html'),
    (r'game\adventure\adventure.js', '/tmp/g_a.js',    '/var/www/game/adventure/adventure.js'),
    (r'game\adventure\adventure.css', '/tmp/g_a.css',  '/var/www/game/adventure/adventure.css'),
    (r'game\assets\village_bg.png', '/tmp/g_v.png',    '/var/www/game/assets/village_bg.png'),
    (r'game\assets\hill_far.png',   '/tmp/g_hf.png',   '/var/www/game/assets/hill_far.png'),
    (r'game\assets\hill_near.png',  '/tmp/g_hn.png',   '/var/www/game/assets/hill_near.png'),
]
cmd = []
for local, tmp, dst in FILES:
    sftp.put(os.path.join(B, local), tmp)
    cmd.append(f'sudo cp {tmp} {dst}')
sftp.close()
_, so, se = ssh.exec_command(' && '.join(cmd))
print(so.read().decode('utf-8', 'ignore'))
err = se.read().decode('utf-8', 'ignore')
if err.strip(): print('ERR:', err[:400])

_, so, _ = ssh.exec_command(
    'for u in "" "runner/" "runner/game.js" "adventure/" "adventure/adventure.js"; '
    'do printf "%-24s " "/$u"; curl -s -o /dev/null -w "%{http_code}\\n" "https://game.ratapi.com/$u"; done')
print(so.read().decode('utf-8', 'ignore'))
ssh.close(); print('DONE')
