require('dotenv').config({ path: '../.env' })
const { Item, Order } = require('../models')
const { OrderContractJSON, ItemContractJSON, web3 } = require('./infura.controller')
const multer = require('multer')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/pictures/items/')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + file.originalname)
    }
})

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true)
        } else {
            cb(null, false)
            return cb(new Error('Only .png, .jpg and .jpeg format allowed!'))
        }
    },
    limits: {
        fileSize: 4 * 1024 * 1024,
    }
}).single('file')

const getRawItem = (req, res) => {
    Item.findById(req.params.address)
        .select('-_id name description specifications externalLink picture')
        .then(item => res.status(200).json(item))
        .catch(error => res.status(404).json(error))
}

const getItems = (req, res) => {
    Item
        .find({ state: 0 })
        .sort('-createdAt')
        .select('name picture price owner')
        .limit(12)
        .then(items => res.status(200).json(items))
        .catch(error => res.status(404).json(error))
}

const getMyItems = (req, res) => {
    Item
        .find({ owner: req.query._id })
        .where({ state: { $ne: 4 } })
        .sort('-createdAt')
        .select('name picture price owner')
        .limit(12)
        .then(items => res.status(200).json(items))
        .catch(error => res.status(404).json(error))

}

const getItem = (req, res) => {
    Item
        .findById(req.query._id)
        .then(item => res.status(200).json(item))
        .catch(error => res.status(404).json(error))
}

const searchItem = (req, res) => {
    Item
        .find(({ name: { $regex: req.query.keywords, $options: 'i' } }))
        .sort('-createdAt')
        .limit(12)
        .then(items => {
            res.status(200).json(items)
        })
        .catch(error => res.status(404).json(error))
}

const createItem = (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.log('A Multer error occurred when uploading.')
            res.status(500).json({ error: 'A Multer error occurred when uploading.' })
        } else if (err) {
            console.log('An unknown error occurred when uploading: ' + err)
            res.status(500).json({ error: 'An unknown error occurred when uploading: ' + err })
        }
        req.body.picture = `http://${process.env.ADDRESS}/pictures/items/${req.file.filename}`
        req.body._id = req.file.filename.substring(0, 41)
        const newItem = new Item(req.body)
        newItem
            .save()
            .then(item => {
                // return soliditySha3 data
                Item
                    .findById(item._id)
                    .select('-_id name description specifications externalLink picture')
                    .then(itemRawData => web3.utils.soliditySha3(itemRawData))
                    .then(rawDataHash => {
                        Item
                            .findByIdAndUpdate(item._id, {
                                rawDataHash: rawDataHash
                            }).exec(error => error ? res.status(500).json(error) : res.status(201).json(rawDataHash))
                    })
                    .catch(error => {
                        console.log(error)
                        res.status(500).json({ error: error })
                    })
            })
            .catch(error => {
                console.log(error)
                res.status(500).json({ error: error })
            })
    })
}


module.exports = {
    getRawItem,
    getItem,
    getItems,
    getMyItems,
    createItem,
    searchItem,
}