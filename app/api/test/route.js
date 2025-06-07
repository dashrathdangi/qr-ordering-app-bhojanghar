export async function GET() {
  console.log('Test API route was called!');
  return new Response(JSON.stringify({ message: 'Test OK' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
