async function run() {
  const mod = await import('pdf-parse');
  console.log(Object.keys(mod));
  if (mod.default) console.log('Has default', Object.keys(mod.default));
}
run();
