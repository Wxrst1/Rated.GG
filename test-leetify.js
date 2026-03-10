async function run() {
    const res = await fetch('https://api.leetify.com/api/profile/id/76561199225914225');
    const json = await res.json();
    console.log(JSON.stringify(json.games?.[0]?.stats || {}, null, 2));
}
run();
