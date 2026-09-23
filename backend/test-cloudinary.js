require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

(async () => {
  try {
    console.log('Testing Cloudinary connection...\n');

    console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ MISSING');
    console.log('API key:', process.env.CLOUDINARY_API_KEY ? '✅ loaded' : '❌ MISSING');
    console.log('API secret:', process.env.CLOUDINARY_API_SECRET ? '✅ loaded' : '❌ MISSING');
    console.log('');

    const result = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
      { public_id: `styleai-test/test-${Date.now()}` }
    );

    console.log('✅ Upload successful!');
    console.log('   URL:', result.secure_url);
    console.log('   Size:', result.bytes, 'bytes');

    await cloudinary.uploader.destroy(result.public_id);
    console.log('\n✅ Cleanup done');
    console.log('\n🎉 Cloudinary is configured correctly!');
  } catch (err) {
    console.error('\n❌ FAILED:');
    console.error('   Message:', err.message);
    if (err.http_code) console.error('   HTTP:', err.http_code);
  }
})();