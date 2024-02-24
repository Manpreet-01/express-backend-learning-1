import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,     // one who is subscribing
            ref: "user"
        },
        channel: {
            type: Schema.Types.ObjectId,    //one to who subscriber is subscribing
            ref: "user"
        },
    },
    {
        timestamps: true
    }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

/*

when a subscribe cac => create a document => {channel: cac, subscriber: a}
when b subscribe cac => create a document => {channel: cac, subscriber: b}
when c subscribe cac => create a document => {channel: cac, subscriber: c}
when c subscribe fcc => create a document => {channel: fcc, subscriber: c}
when c subscribe wds => create a document => {channel: wds, subscriber: c}

subscribers:
to get the subsriber count of cac channel => count the documents whose channel matches with cac

channels:
to get the channels list of user c => count the documents whose subscriber mathes with c        

left join:
    join the info from subscription to the user

aggrigation operations / pipelines :
    are stages => 1st stage, 2nd stage, 3rd stage etc..

    if i filter 50 documents from 100 documents.
    then in 2nd stage 50 documents are assumed as original documents
    and operation performed on original only

    aggrigation are handled by mongodb directly insted of mongoose 
    
    in mongoose gives us id as a string
    but in mongodb id is as a objectId

lookup: to join the documents
$lookup: {
    from: "authors",
    localField: "author_id",
    foreignField: "_id",
    as: "author_details"        // gives name to result array 
}
$addFields: {
    author_details: {
        $first: "$author_details" // gives the first value, prefix "$" => bcz it is a field
        // or
        $arrayElement: ["$author_details", 0],  // getting first value from array
    }
}
*/