'use strict';

const {BigQuery} = require('@google-cloud/bigquery');
const {Storage} = require('@google-cloud/storage');


const extractTableJSON = async function() {

    const bigquery = new BigQuery();
    const storage = new Storage();

    const datasetId = 'cafjsCostUS';
    const tableId = 'cpuMemActual';
    const bucketName = 'cpu_mem_actual_dummy';
    const filename = 'stats.json';

    // Location must match that of the source table.
    const options = {
        format: 'json',
        location: 'US',
    };

    const [job] = await bigquery
        .dataset(datasetId)
        .table(tableId)
        .extract(storage.bucket(bucketName).file(filename), options);

    console.log(`Job ${job.id} created.`);

    // Check the job's status for errors
    const errors = job.status.errors;
    if (errors && errors.length > 0) {
        throw errors;
    }
};

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 */
exports.helloPubSub = (event) => {
    const message = event.data ?
        Buffer.from(event.data, 'base64').toString() :
        'Extracting table to json';
    console.log(message);
    extractTableJSON();

};
