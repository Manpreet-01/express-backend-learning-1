import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


// routes imports
import userRouter from "./routes/user.routes.js";


// routes declaration
app.use("/api/v1/users", userRouter);



/* error handling with custom middleware  !!! should be placed at the end */
app.use((err, req, res, next) => {
    console.error("Error in express app :: ", err);
    res.status(err?.statusCode || 404).send(err || "interal server error");
});

export { app };