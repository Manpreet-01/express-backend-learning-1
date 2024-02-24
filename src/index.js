import dotenv from "dotenv";
dotenv.config({
    path: '.env'
});

import connectDB from "./db/index.db.js";
import { app } from './app.js';

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running at port : ${process.env.PORT || 8000}`);
        });
    })
    .catch((err) => {
        console.log("MONGODB connection failed !!! ", err);
    });

