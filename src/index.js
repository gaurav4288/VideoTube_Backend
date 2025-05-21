import dotenv from 'dotenv';
import express from 'express';
import connectDB from './db/index.js';
import { app } from './app.js';

const PORT = process.env.PORT;


dotenv.config({
    path: './env'
})

connectDB()
.then( () => {
    app.listen(PORT || 8000, () => {
        console.log(`app listening on http://localhost:${PORT}`);
    })
})
.catch( (err) => {
    console.log("MONGODB connection failed");
})

