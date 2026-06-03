# 部署指南

## Docker Compose 部署

```bash
docker-compose up -d
```

前端: http://localhost:80
后端: http://localhost:8000

## 手动部署

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 设置 MINIMAX_API_KEY
python main.py  # 监听 0.0.0.0:8000
```

### 前端

```bash
cd client
npm install
npm run build    # 生产构建
# 静态文件部署到 Nginx 或 serve
npx serve -s dist -l 80
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name localhost;

    # 前端静态文件
    location / {
        root /app/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| MINIMAX_API_KEY | MiniMax API密钥 | (必填) |
| MINIMAX_API_HOST | API地址 | https://api.minimaxi.com |
| DATA_DIR | 数据目录 | ./data |
| BACKEND_PORT | 后端端口 | 8000 |
| FRONTEND_URL | 前端地址 | http://localhost:5173 |
