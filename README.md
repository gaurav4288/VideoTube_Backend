# VideoTube Backend API

This project is a backend API for a Youtube-like video sharing platform, built with **Node.js**, **Express**, and **MongoDB**. It supports user authentication, video upload and streaming, likes, comments, subscriptions, watch history, and more.

---

## Features

- **User Authentication**: Register, login, logout, JWT-based auth.
- **Video Upload & Streaming**: Upload videos and thumbnails, stream videos.
- **Cloudinary Integration**: Store videos and images on Cloudinary.
- **Likes & Comments**: Like videos, comment on videos, reply to comments.
- **Subscriptions**: Subscribe/unsubscribe to channels.
- **Watch History**: Track and retrieve user watch history.
- **Fuzzy Search**: Search videos by title/description with typo tolerance (Atlas Search or Fuse.js).
- **Pagination & Sorting**: Paginated video lists, sort by views, date, etc.
- **Profile Management**: Update avatar, cover image, and account details.

---

## Tech Stack

- **Node.js** & **Express**
- **MongoDB** with **Mongoose**
- **Cloudinary** for media storage
- **JWT** for authentication
- **Multer** for file uploads
- **Fuse.js** or **MongoDB Atlas Search** for fuzzy search

---

## Getting Started

### 1. Clone the repository

```sh
https://github.com/gaurav4288/VideoTube_Backend.git
cd youtube-like-backend
```

### 2. Install dependencies

```sh
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory and add:

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Start the server

```sh
npm run dev
```

---

## API Endpoints

### Auth
- `POST /api/v1/users/register` — Register a new user
- `POST /api/v1/users/login` — Login
- `POST /api/v1/users/logout` — Logout

### Videos
- `POST /api/v1/videos` — Upload a video
- `GET /api/v1/videos` — Get all videos (with search, pagination)
- `GET /api/v1/videos/:videoId` — Get video by ID
- `DELETE /api/v1/videos/:videoId` — Delete a video

### Likes, Comments, Subscriptions, History
- `POST /api/v1/videos/:videoId/like`
- `POST /api/v1/videos/:videoId/comment`
- `POST /api/v1/users/subscribe/:channelId`
- `GET /api/v1/users/history`

---

## Search

- **Fuzzy search** is supported using MongoDB Atlas Search (recommended) or Fuse.js (in-memory, for small datasets).

---

## Credits

This project is inspired by and based on the work of [Hitesh Choudhary](https://github.com/hiteshchoudhary/chai-backend).  
Special thanks for the open-source chai-backend repository and educational content.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)

---

## Author

- [Gaurav Kumar Singh](https://github.com/gaurav4288)


