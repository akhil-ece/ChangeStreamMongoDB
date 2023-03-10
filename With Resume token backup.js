const MongoClient = require('mongodb').MongoClient;

async function startChangeStream() {
  const client = await MongoClient.connect('mongodb+srv://admin:admin@cluster0.8dymixf.mongodb.net');
  const db = client.db('test');
  // const oplog = client.db("local").collection("oplog.rs");
  // let firstItem = await oplog.findOne({ ns: "test.StreamTest" }, { sort: { $natural: -1 } });
  // await booksWatch(db);
  // await databaseWatch(db);
  const collection = db.collection('books');
  console.log("Database connected");
  // list = collection.find();
  // console.log(list);
  let resumeToken = await db.collection('resumeToken').findOne({});
  resumeToken = resumeToken ? resumeToken.resumeToken : {};
  const changeStream = collection.watch({ "resumeAfter" : resumeToken });
  const AuditColl = db.collection('AuditCollection');
  
  await changeStream.on('change', async (next) => {
    console.log('Received change event:', next);
    resumeToken = next._id;
    await db.collection('resumeToken').updateOne({}, { $set: { resumeToken } }, { upsert: true });
    let insertDocument = getInsertDocument(next);
    switch(next.operationType){
      case "insert":
        insertDocument.Operation = next.operationType;
        insertDocument.Description = next.fullDocument;
        break;
      case "update":
        insertDocument.Operation = next.operationType;
        insertDocument.Description = next.updateDescription;
        break;
      }
    await AuditColl.insertOne(insertDocument);
  });
  const dbPipeline = [
    {
      $match: {
        $and: [
          {
            ns: {
              $ne: {
                db: "test",
                coll: "AuditCollection",
              },
            },
          },
          {
            ns: {
              $ne: {
                db: "test",
                coll: "resumeToken",
              },
            },
          },
          {
            ns: {
              $ne: {
                db: "test",
                coll: "books",
              },
            },
          },
        ],
      },
    },
  ];
  const dbWatch = db.watch(dbPipeline, { "resumeAfter" : resumeToken });
  await dbWatch.on('change', async (next) => {
    console.log('Received change event:', next);
    resumeToken = next._id;
    await db.collection('resumeToken').updateOne({}, { $set: { resumeToken } }, { upsert: true });
    let insertDocument = getInsertDocument(next);
    switch(next.operationType){
      case "insert":
        insertDocument.Operation = next.operationType;
        insertDocument.Description = next.fullDocument;
        break;
      case "update":
        insertDocument.Operation = next.operationType;
        insertDocument.Description = next.updateDescription;
        break;
      }
    await AuditColl.insertOne(insertDocument);
  });
}
function getInsertDocument(streamNext)
{
  const date = new Date((streamNext.clusterTime.high * 1000) + (streamNext.clusterTime.low / 1000));
  let insertDocument = {"CollectionInfo": null, "Operation": null, "Description": null, "TimeStamp": date};
  insertDocument.CollectionInfo = streamNext.ns.db + "." + streamNext.ns.coll;
  return insertDocument;
}
async function booksWatch(db)
{
  
}
async function databaseWatch(db)
{
  
}
// async function resumeIfAny(db)
// {
//   let resumeToken = await db.collection('resumeToken').findOne({});
//   resumeToken = resumeToken ? resumeToken.resumeToken : {};
//   const changeStream = client.watch([], { "resumeAfter" : resumeToken });
//   changeStream.on('change', async next => {
//     console.log('Change detected: ', next);
//     resumeToken = next._id;
//     await db.collection('resumeToken').updateOne({}, { $set: { resumeToken } }, { upsert: true });
//   });
// }
startChangeStream();
