module.exports = {
  apps: [
    {
      name: 'server',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres.pxyiruxducjidsdcwhkm:Dashrath%2369@aws-0-ap-south-1.pooler.supabase.com:6543/postgres', // 💡 include %23 for #
        SECRET_KEY: 'bHOf9sjRckXiovL2G9yf73ySpfQSmbhZ7P+y+SHjyBk=',
        PORT: 8080
      }
    }
  ]
}
