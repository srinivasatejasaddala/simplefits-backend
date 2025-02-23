const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const nodemailer=require('nodemailer')
const app = express();
const bcrypt = require('bcryptjs')
const middleware = require('./middleware')
const dotenv = require('dotenv')
const multer = require('multer')
const cloudinary=require('cloudinary')
dotenv.config();
app.use(cors());
app.use(express.json());
const port=process.env.PORT || 5000
// const { all_product } =require('./all_items')
// import { all_product } from './all_items';




// const storage = multer.memoryStorage();
// const upload = multer({ storage });
app.get('/',(req,res)=>{
    res.send("Fashon Club Api Home Page");
})

mongoose.connect(process.env.MONGO_URI).then(
    console.log("connected to mongodb")
    
).catch((err) => { console.log(err) })

const User_Schema = new mongoose.Schema({
    email: {
        type: String,
        unique:true
    },
    password: {
        type: String,
    },
    username: {
        type: String,
    },
    mobile: {
        type: String,
       
    },
    pincode: {
        type: Number,
    },
    street: {
        type: String,
    },
    city: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        default:false
    },
    otp: {
        type:String
    },
    otptime: {
        type:Date
    },
    optverified: {
        type: Boolean,
        default:false
    }

})

const User_Model = new mongoose.model('User_Collection', User_Schema)



const products_schema = new mongoose.Schema({
    name: String,
    category: String,
    image: String,
    new_price: Number,
    old_price:Number
})


const products_model = mongoose.model("Products", products_schema);


// app.get('/upload',async (req, res) => {
//     const new_data =  products_model.insertMany( all_product )
   
//     await res.json(new_data);
// })

const cart_schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User_Collection',
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'products_model'
    },
    name: String,
    category: String,
    image: String,
    new_price: Number,
    old_price: Number,
    size: String,
    quantity:Number
})
const cart_model = mongoose.model("cart", cart_schema);

const orders_schema = new mongoose.Schema({
     user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User_Collection',
    },
    isCancelled: Boolean,
    cancelledDate:Date,
    name: String,
    category: String,
    image: String,
    new_price: Number,
    size: String,
    quantity:Number
}
    ,
    {timestamps:true}
)

const orders_model = new mongoose.model('orders', orders_schema)


app.post('/place_order', middleware, async (req, res) => {
    const date = new Date();
    const cart_items = await req.body.cart_items;
    // console.log(await cart_items);
    
    for (let i = 0; i < cart_items.length;i++ ) {
        let neworder =await new orders_model({
            user: req.user.id,
            isCancelled: false,
            cancelledDate:null,
            name: cart_items[i].name,
            category: cart_items[i].category,
            image: cart_items[i].image,
            new_price: cart_items[i].new_price,
            size: cart_items[i].size,
            quantity:cart_items[i].quantity
        })
       await neworder.save();
    }
    await cart_model.deleteMany({user:req.user.id})
})

app.get('/get_orders', middleware, async (req, res) => {
   
    
    return res.json(await orders_model.find({ user: req.user.id }));
    
})

app.post('/cancel_order', async (req, res) => {
    const date = new Date();
    console.log(date);
    console.log(req.body.id);
    
    const cancelitem = await orders_model.findByIdAndUpdate(req.body.id, { "isCancelled": true ,"cancelledDate": date })
    console.log(cancelitem);
    
    // await cancelitem.save();
})

const otpcode = () => {
    const otp = (""+Math.random()).substring(2, 8)
    return otp
    
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "tejachaithu409@gmail.com",
        pass:process.env.EMAIL_APP_PASSWORD
    }
})


// app.get('/sendemail', async (req, res) => {
//     transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//          console.log(error);
            
//         }
//         else {
//             console.log(info.response);
            
//         }
//     })
// })
app.post('/register', async (req, res) => {
    try {
        const exists = await User_Model.findOne({ email: req.body.email })
        const newotp=otpcode()
           
        if (!exists) {
            const hassed_password = await bcrypt.hash(req.body.password, 10);
            const new_user = new User_Model({
                email: req.body.email,
                password: hassed_password,
                username: req.body.username,
                mobile: req.body.mobile,
                pincode: req.body.pincode,
                street: req.body.street,
                city: req.body.city,
                otp: newotp,
                optverified: false,
                otptime:new Date(Date.now()+10*60*1000)
            })
            
             const mailOptions = {
                from: "tejachaithu409@gmail.com",
                to: req.body.email,
                subject: "Verify Your Email for SimpleFits - Code Expires in 10 Minutes",
             html:`<h1>Dear ${exists.username},</h1><p> Thank you for registering with SimpleFits! To complete your sign-up, please verify your email by entering the following code:</p><p> Your Verification Code: ${newotp}</p>
 <p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
<p>  Best regards,<p>
<p>  SimpleFits Team </p>`
            }
            await new_user.save();
          
          
            // await transporter
            await   transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                console.log(error);
                    console.log('MAIL ERROR');
                    
                }
                else {
                    console.log(info.response);
                    
                }
            })
                    // res.send("user created")
            // res.send("code sent")
             res.json({ "message": "code sent", id: new_user._id }); 
        }
        else {
         
            if (exists.optverified === false) {
            exists.otp = newotp;
            exists.otptime =  new Date(Date.now() + 10 * 60 * 1000);
                await exists.save();
                
                 const mailOptions = {
                from: "tejachaithu409@gmail.com",
                to: req.body.email,
                subject: "Verify Your Email for SimpleFits - Code Expires in 10 Minutes",
             html:`<h1>Dear ${exists.username},</h1><p> Thank you for registering with SimpleFits! To complete your sign-up, please verify your email by entering the following code:</p><p> Your Verification Code: ${newotp}</p>
 <p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
<p>  Best regards,<p>
<p>  SimpleFits Team </p>`
            }    

            await   transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                console.log(error);
                    console.log('MAIL ERROR');
                    
                }
                else {
                    console.log(info.response);
                    
                }
            })
                // res.send("user created")
                console.log(exists);
            // res.send("code sent")
                res.json({ "message": "code sent", id: exists._id }); 
            
            }
            else {
              console.log(exists);                
               console.log("message"+ "  User already exists");
               
                return res.json({ "message": "User already exists" })
            }
            
        }
    }
    catch (err) {
        console.log("MAIN ERROR");
        
        console.log(err);
        
    }
})


app.post('/verify-otp', async (req, res) => {
    const new_user = await User_Model.findById(req.body.id);
    const time = new Date();
    if (new_user.optverified === false) {
       
        if (new_user.otp===req.body.otp && new_user.otptime > time) {
            new_user.optverified = true;
            await new_user.save();
            res.send('verified')
        }
        else if (new_user.otp!==req.body.otp) {
            res.send("Incorrect verifcation code")
        }
        else {
            res.send("Expired")
            console.log(time);
            console.log(new_user.otptime);
            console.log(new_user.otp===req.body.otp);
            
            
        }
    }
})


app.post('/login', async (req, res) => {
        try {
            const exists = await User_Model.findOne({ email: req.body.email });
            console.log(req.body);
            
            if (!exists ) {
                res.send("User dosenot exists");
            }
            else if ( exists.optverified===false) {
                res.send("mail not verified register again");
            }
            else {
                const check_password = await bcrypt.compare(req.body.password, exists.password)
                console.log(check_password);
                
                if (check_password) {
                    const payload= {
                    user: {
                        id:exists.id,
                    }
                }
                    const token = await jwt.sign(payload, 'TEJA_SECRET_KEY')
                    exists.otp = null;
                    exists.otptime = null;
                res.send(token)
                
                }
                else {
                    return res.send("Incorrect Password");
                }
            
            }
              }
         catch (err) {
        console.log(err);
        
    }
})


app.post('/cart', middleware, async (req, res) => {
    try{
            // console.log(req.body);
            
            const item = await products_model.findById(req.body.id )
            // console.log(item);
            
            const exists = await cart_model.findOne({user:req.user.id,  item_id:req.body.id, size: req.body.size });
            if (!exists) {
                const cart_item = new cart_model({
                
                    user: req.user.id,
                    item_id:req.body.id,
                    name: item.name,
                    category: item.category,
                    image: item.image,
                    new_price: item.new_price,
                    old_price: item.old_price,
                    size: req.body.size,
               
                    quantity: 1
                })
                await cart_item.save();
                return  res.send("inserted")
            }
            else {
                res.send('already in the cart')
            }

      }
    catch (err) {
        console.log(err);
        
    }
})

app.post('/quantity', async (req, res) => {
        try{
            const quantity = await cart_model.findByIdAndUpdate(req.body.id, { quantity:req.body.quantity });
            await quantity.save();
            return res.json(await cart_model.find())
          }
    catch (err) {
        console.log(err);
        
    }
})

app.get('/get_cart', middleware, async (req, res) => {
    try{
          return res.json(await cart_model.find({ user: req.user.id }));
      }
    catch (err) {
        console.log(err);
        
    }
})
app.post('/remove_cart_item', middleware, async (req, res) => {
    try{
        const remove_item = await cart_model.deleteOne({ user:req.user.id, _id:req.body.id})
        res.send("removed")
      }
    catch (err) {
        console.log(err);
        
    }
})
app.get('/cart_length', middleware, async (req, res) => {
     try{
            const len = await (await cart_model.find({ user: req.user.id })).length
           
            
         return res.json(len);
       }
    catch (err) {
        console.log(err);
        
    }
})

// app.get('/deleteall',async (req, res) => {
//     await cart_model.deleteMany();
//     res.send(await cart_model.find())
// })

app.post('/check_in_cart', middleware, async (req, res) => {
    try{
        const exists = await cart_model.findOne({ user: req.user.id, item_id: req.body.id, size: req.body.size });
        if (exists) {
            return res.json(true)
        }
        else {
            return res.json(false)
        }
      }
    catch (err) {
        console.log(err);
        
    }
})


app.get('/all_items', async (req, res) => {
    try{
        res.json(await products_model.find().lean());
      }
    catch (err) {
        console.log(err);
        
    }
})
app.get('/men', async (req, res) => {
    try {
        res.json(await products_model.find({ "category": "Men" }))
      }
    catch (err) {
        console.log(err);
        
    }
})  

app.get('/women', async (req, res) => {
    try{
        res.json(await products_model.find({ "category": "Women" }))
      }
    catch (err) {
        console.log(err);
        
    }        
})


app.get('/kid', async (req, res) => {
    try {
        res.json(await products_model.find({ "category": "Kid" }))
      }
    catch (err) {
        console.log(err);
        
    }
})


app.get('/popular', async (req, res) => {
    try {
        const data = await products_model.find({ "category": "Women" });
        res.json(await data.slice(0,4))
    }
    catch (err) {
        console.log(err);
        
    }
})


app.get('/new_collection', async (req, res) => {
    try{
        let data = await products_model.find({ "category": "Kid" });
        res.json(await data.slice(0, 8));
      }
    catch (err) {
        console.log(err);
        
    }
})


app.get('/user_details',middleware,async (req, res) => {
    
    res.json(await User_Model.findById(req.user.id))
})

app.get('/get_users',async (req, res) => {
   return  res.json(await User_Model.find())
})

app.post('/delete_item', async (req, res) => {
    // console.log(req.body.id);
    
   await products_model.findByIdAndDelete(req.body.id);
})


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = multer.memoryStorage();
const upload = multer({ storage })
app.post('/new_product', upload.single('image'),async (req, res) => {
    try {

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { name, category, new_price, old_price } = req.body; 
        console.log(req.body);
        
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(base64Image, {
            folder: 'products'
        });
        const new_product = await new products_model({
            name: name,
            category: category,
            new_price: new_price,
            old_price: old_price,
            image:result.secure_url 
        })
        await new_product.save();
        console.log(await new_product);
        
    }
    catch(err) {
        console.log(err);
        
    }
})
app.post('/update_product', async (req, res) => {
    await products_model.findByIdAndUpdate(req.body.id,{new_price:req.body.new_price,old_price:req.body.old_price})
})

app.post('/remove_user', async (req, res) => {
    await User_Model.findByIdAndDelete(req.body.id);
})
app.get('/get_user', middleware, async (req, res) => {
    return res.json(await User_Model.findById(req.user.id));
})
app.get('/admin_orders', async (req, res) => {
    // res.json(await orders_model.find({ isCancelled: false }));
     const result = await orders_model.find({ isCancelled: false });
    const address = [];
    for (let index = 0; index < result.length; index++) {
        
        const details = await User_Model.findById(result[index].user);
        address.push(details);

    }
    res.json([result,address]);
})
app.get('/cancelled_orders', async (req, res) => {
    const result = await orders_model.find({ isCancelled: true });
    const address = [];
    for (let index = 0; index < result.length; index++) {
        
        const details = await User_Model.findById(result[index].user);
        address.push(details);

    }
    res.json();
})



app.listen(port,console.log(`running in port ${port}`));

