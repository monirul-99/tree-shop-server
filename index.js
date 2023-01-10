const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
// const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//middle ware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pnmtejr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const allCardDataCollection = client
      .db("TreeShopSeconds")
      .collection("TreeShopSecondsData");
    const allCartOrdersCollection = client
      .db("TreeShopSeconds")
      .collection("Orders-Products");
    const allWishListProductsCollection = client
      .db("TreeShopSeconds")
      .collection("WishList-Products");
    const allCartPaymentsCollection = client
      .db("TreeShopSeconds")
      .collection("Orders-Products-Payments");

    app.get("/card-data", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {};
      const cursor = allCardDataCollection.find(query);
      const result = await cursor
        .skip(page * size)
        .limit(size)
        .toArray();
      const count = await allCardDataCollection.estimatedDocumentCount();
      res.send({ count, result });
    });

    app.get("/search-card-data", async (req, res) => {
      const search = req.query.search;
      // const page = parseInt(req.query.page);
      // const size = parseInt(req.query.size);
      // console.log(page, size);
      const query = {
        $text: {
          $search: search,
        },
      };
      const cursor = allCardDataCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/shop-card-data", async (req, res) => {
      const query = {};
      const order = req.query.order === "asc" ? 1 : -1;
      const cursor = allCardDataCollection.find(query).sort({ price: order });
      const result = await cursor.toArray();
      const count = await allCardDataCollection.estimatedDocumentCount();
      res.send({ count, result });
    });

    app.get("/card-data/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await allCardDataCollection.findOne(filter);
      res.send(result);
    });

    app.get("/related-products/:category", async (req, res) => {
      const cateText = req.params.category;
      const filter = { categories: cateText };
      const result = await allCardDataCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/related-products-outdoor", async (req, res) => {
      const result = await allCardDataCollection
        .find({ sector: "outdoor" })
        .toArray();
      const count = await allCardDataCollection.estimatedDocumentCount();
      res.send({ count, result });
    });

    app.get("/related-products-indoor", async (req, res) => {
      const result = await allCardDataCollection
        .find({ sector: "indoor" })
        .toArray();
      const count = await allCardDataCollection.estimatedDocumentCount();
      res.send({ count, result });
    });

    app.get("/related-products-flower", async (req, res) => {
      const result = await allCardDataCollection
        .find({ sector: "flower" })
        .toArray();
      const count = await allCardDataCollection.estimatedDocumentCount();
      res.send({ count, result });
    });

    app.get("/orders-products", async (req, res) => {
      const query = {};
      const result = await allCartOrdersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/wishlist-products", async (req, res) => {
      const query = {};
      const result = await allWishListProductsCollection.find(query).toArray();
      res.send(result);
    });

    // app.post("/products-orders/:id", async (req, res) => {
    //   const query = req.params.id;
    //   const id = { _id: ObjectId(query) };
    //   const filter = await allCartOrdersCollection.findOne(id);
    //   const option = { upsert: true };
    //   if (!filter) {
    //     const updateDoc = {
    //       $set: {
    //         Quantity: 1,
    //       },
    //     };
    //     const result = await allCartOrdersCollection.insertOne(
    //       id,
    //       updateDoc,
    //       option
    //     );
    //     res.send(result);
    //   } else {
    //     const updateDoc = {
    //       $set: {
    //         Quantity: 1,
    //       },
    //     };
    //     const result = await allCartOrdersCollection.updateOne(
    //       id,
    //       updateDoc,
    //       option
    //     );
    //     res.send(result);
    //   }
    // });

    app.post("/products-orders", async (req, res) => {
      const order = req.body;
      const result = await allCartOrdersCollection.insertOne(order);
      res.send(result);
    });

    app.post("/products-wishlist", async (req, res) => {
      const order = req.body;
      const result = await allWishListProductsCollection.insertOne(order);
      res.send(result);
    });

    app.delete("/orders-products-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await allCartOrdersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/products-search-by/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await allCartOrdersCollection.findOne(query);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const product = req.body;
      const price = product.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientServer: paymentIntent.client_secret,
      });
    });

    app.post("/payment-success-identify", async (req, res) => {
      const payment = req.body;
      const result = await allCartPaymentsCollection.insertOne(payment);
      const id = payment.productsId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await allCartOrdersCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    // app.get("/update", async (req, res) => {
    //   const filter = {};
    //   const option = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       Quantity: 0,
    //     },
    //   };
    //   const result = await allCardDataCollection.updateMany(
    //     filter,
    //     updateDoc,
    //     option
    //   );

    //   res.send(result);
    // });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Tree Shop Running");
});

app.listen(5000, () => console.log("Terminal All Right"));
