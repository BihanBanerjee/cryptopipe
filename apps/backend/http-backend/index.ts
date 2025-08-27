import express from "express"

const PORT = process.env.PORT || 3000; 


const app = express();
app.use(express.json());


app.post("/signin" , () => {
  
})


app.post("/signup" , () => {
  
})





app.listen(PORT , () => {
    console.log(`listening on port ${PORT}`);
})