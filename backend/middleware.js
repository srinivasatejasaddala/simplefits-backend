const jwt = require('jsonwebtoken')
// const dotenv = require('dotenv')
// dotenv.config();
module.exports = (req, res, next) => {
    
    const token = req.header('mern_token');
     if (!token) {
        return res.send("Token not awailable")
    }
    try {
        // console.log(process.env.SECRET_KEY);
        
        let get_user = jwt.verify(token, process.env.SECRET_KEY);
        req.user = get_user.user;
        next()
    }
    catch (err) {
        console.log(err);
        
    }
}
