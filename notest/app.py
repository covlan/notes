from flask import Flask, render_template, request, jsonify, redirect, url_for
import os

app = Flask(__name__)

# 页面路由映射
PAGE_ROUTES = {
    '/': 'login.html',
    '/login': 'login.html',
    '/register': 'register.html',
    '/notes': 'notes.html',
    '/dashboard': 'dashboard.html',
    '/note-categories': 'note-categories.html',
    '/note-share': 'note-share.html',
    '/profile-edit': 'profile-edit.html',
    '/settings': 'settings.html',
    '/starred-notes': 'starred-notes.html',
    '/tags': 'tags.html',
    '/trash': 'trash.html',
    '/note-editor-modal': 'note-editor-modal.html'
}

# 重定向带.html后缀的URL到无后缀版本
@app.before_request
def redirect_html_urls():
    path = request.path
    if path.endswith('.html'):
        clean_path = path[:-5]
        return redirect(clean_path, code=301)

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/notes')
def notes():
    return render_template('notes.html')

@app.route('/note-editor-modal')
def note_editor_modal():
    return render_template('note-editor-modal.html')

@app.route('/note/<path:filename>')
def note(filename):
    # 移除.html后缀（如果存在）
    if filename.endswith('.html'):
        return redirect(f'/note/{filename[:-5]}', code=301)
    return render_template(f'note/{filename}.html')

# 处理所有其他页面路由
@app.route('/<path:path>')
def catch_all(path):
    # 移除.html后缀（如果存在）
    if path.endswith('.html'):
        return redirect(f'/{path[:-5]}', code=301)
    
    # 检查是否是有效的页面路由
    if f'/{path}' in PAGE_ROUTES:
        return render_template(PAGE_ROUTES[f'/{path}'])
    
    # 如果不是有效的路由，返回404
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(debug=True) 