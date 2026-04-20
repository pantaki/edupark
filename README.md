# 🎓 Học Vui – Kids Learning App

> Ứng dụng học tập vui vẻ cho trẻ em 6–10 tuổi với Quiz Multiplayer, Chat Realtime và AI tạo câu hỏi.

## 🚀 Tech Stack
- **Frontend**: Next.js 14 (App Router) + React + TailwindCSS
- **Backend**: Supabase (Auth + PostgreSQL + Realtime)
- **AI**: Anthropic Claude API (tạo quiz)
- **Deploy**: Vercel

---

## ⚙️ Cài đặt Local

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/hoc-vui.git
cd hoc-vui

# 2. Cài dependencies
npm install

# 3. Copy env file
cp .env.local.example .env.local
# Điền các giá trị vào .env.local

# 4. Chạy development server
npm run dev
```

Mở http://localhost:3000

---

## 🗄️ Setup Supabase

### Bước 1: Tạo project
1. Vào https://supabase.com → New Project
2. Điền tên project, password, chọn region gần nhất (Singapore)

### Bước 2: Chạy SQL Schema
1. Vào **SQL Editor** trong Supabase Dashboard
2. Copy toàn bộ nội dung file `supabase-schema.sql`
3. Paste vào SQL Editor → **Run**

### Bước 3: Lấy API Keys
1. Vào **Settings → API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Bước 4: Enable Realtime
1. Vào **Database → Replication**
2. Enable Realtime cho tables: `messages`, `rooms`, `room_players`

---

## 🤖 Setup Anthropic AI

1. Vào https://console.anthropic.com
2. Tạo API Key mới
3. Copy vào `.env.local` → `ANTHROPIC_API_KEY`

---

## 📦 Deploy lên Vercel

### Bước 1: Push lên GitHub
```bash
git init
git add .
git commit -m "🚀 Initial commit – Học Vui app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hoc-vui.git
git push -u origin main
```

### Bước 2: Connect Vercel
1. Vào https://vercel.com → **New Project**
2. Import từ GitHub repo vừa tạo
3. Vercel sẽ tự detect Next.js

### Bước 3: Thêm Environment Variables
Trong Vercel project settings → **Environment Variables**, thêm:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL từ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key từ Supabase |
| `ANTHROPIC_API_KEY` | API key từ Anthropic |

### Bước 4: Deploy
Click **Deploy** → Vercel sẽ build và deploy tự động.

---

## 📁 Cấu trúc Project

```
hoc-vui/
├── app/
│   ├── page.tsx                    # Trang chủ (chọn vai)
│   ├── parent/
│   │   ├── login/page.tsx          # Đăng nhập ba/mẹ
│   │   ├── dashboard/page.tsx      # Dashboard ba/mẹ
│   │   ├── children/page.tsx       # Quản lý con
│   │   ├── chat/page.tsx           # Chat realtime
│   │   └── create-quiz/page.tsx    # Tạo quiz với AI
│   ├── student/
│   │   ├── enter-code/page.tsx     # Nhập mã học sinh
│   │   ├── subjects/page.tsx       # Chọn môn học
│   │   ├── learn/page.tsx          # Làm bài tập
│   │   └── progress/page.tsx       # Xem tiến độ
│   ├── quiz/
│   │   ├── join/page.tsx           # Vào phòng quiz
│   │   ├── create/page.tsx         # Tạo phòng quiz
│   │   └── room/[code]/page.tsx    # Phòng chơi multiplayer
│   └── api/
│       └── generate-quiz/route.ts  # API tạo quiz bằng AI
├── components/
│   └── shared/
│       └── BottomNav.tsx           # Navigation bar
├── lib/
│   ├── supabaseClient.ts           # Supabase client
│   ├── ai.ts                       # AI helper
│   ├── store.ts                    # Zustand state
│   └── utils.ts                    # Utilities
└── supabase-schema.sql             # Database schema
```

---

## 🎮 Hướng dẫn sử dụng

### Dành cho Ba/Mẹ:
1. Vào trang chủ → **Cha/Mẹ**
2. Đăng ký tài khoản bằng email
3. Tạo hồ sơ cho con → nhận **Mã học sinh** (VD: `MNH001`)
4. Chia sẻ mã cho con
5. Theo dõi tiến độ học, chat với con, tạo quiz

### Dành cho Học sinh:
1. Vào trang chủ → **Học Sinh**
2. Nhập mã học sinh (hỏi ba/mẹ)
3. Chọn môn học và làm bài
4. Vào phòng quiz để cạnh tranh với bạn bè

### Quiz Multiplayer:
1. Ba/mẹ hoặc bất kỳ ai tạo phòng tại `/quiz/create`
2. Chia sẻ mã phòng cho người chơi khác
3. Vào phòng tại `/quiz/join` bằng mã phòng
4. Host bắt đầu game, mọi người cùng trả lời

---

## 🔧 Troubleshooting

**Lỗi "relation does not exist"**: Chạy lại `supabase-schema.sql` trong SQL Editor

**Realtime không hoạt động**: Kiểm tra bảng đã được add vào Replication trong Supabase

**AI không tạo được quiz**: Kiểm tra `ANTHROPIC_API_KEY` đã đúng chưa

**Lỗi CORS**: Thêm domain Vercel vào Supabase → Authentication → URL Configuration

---

## 📄 License
MIT – Free to use and modify
