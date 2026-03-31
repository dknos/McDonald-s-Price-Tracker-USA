// ── Location picker (index page) ──────────────────────────────────────────
function substituteLocationString(location) {
    [...document.getElementsByClassName("location-substitute")].forEach(el => {
        if (el.href) el.href = el.href.replace("%location%", location);
        else el.textContent = el.textContent.replace("%location%", location);
    });
}

// Known US states + territories
const US_LOCATIONS = new Set([
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
    "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
    "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
    "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
    "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
    "Wisconsin","Wyoming","Puerto Rico","United States",
]);

// Countries config — populated as market APKs are extracted and data fetched
// Add new entries here when a new country's data is available.
// filter(l) should return true for location strings belonging to that country.
const COUNTRIES = [
    {
        key: "US", label: "United States", flag: "🇺🇸",
        national: "United States",
        filter: l => US_LOCATIONS.has(l),
    },
    {
        key: "CA", label: "Canada", flag: "🇨🇦",
        national: null,
        // Canadian cities from original dataset + any new ones from fetch_global.py
        filter: l => !US_LOCATIONS.has(l) && l !== "United States",
    },
    // Add more as data becomes available, e.g.:
    // { key: "GB", label: "United Kingdom", flag: "🇬🇧", national: null, filter: l => UK_LOCATIONS.has(l) },
];

const params = new URLSearchParams(window.location.search);
if (!params.has("location")) {
    substituteLocationString("");
    (async () => {
        const [addresses, natStats] = await Promise.all([
            fetch("addresses.json").then(r => r.json()).catch(() => ({})),
            fetch("national_stats.json").then(r => r.json()).catch(() => null),
        ]);
        const locs = addresses.__locations__ || [];
        const availableCountries = COUNTRIES.filter(c => locs.some(l => c.filter(l) && l !== c.national));

        const countrySelect = document.getElementById("country-select");
        const stateSelect = document.getElementById("state-select");
        const goBtn = document.getElementById("location-go");

        // Populate country dropdown
        availableCountries.forEach(c => {
            const opt = new Option(`${c.flag} ${c.label}`, c.key);
            countrySelect.add(opt);
        });

        countrySelect.addEventListener("change", () => {
            const country = COUNTRIES.find(c => c.key === countrySelect.value);
            stateSelect.innerHTML = "<option value=\"\">Select state / region...</option>";
            stateSelect.disabled = true;
            goBtn.disabled = true;
            if (!country) return;

            if (country.national) {
                const opt = new Option(`${country.flag} All — National View`, country.national);
                stateSelect.add(opt);
            }
            locs.filter(l => country.filter(l) && l !== country.national)
                .forEach(loc => stateSelect.add(new Option(loc, loc)));

            stateSelect.disabled = false;
        });

        stateSelect.addEventListener("change", () => {
            goBtn.disabled = !stateSelect.value;
        });

        goBtn.addEventListener("click", () => {
            if (stateSelect.value) window.location = `?location=${encodeURIComponent(stateSelect.value)}`;
        });

        stateSelect.addEventListener("keydown", e => {
            if (e.key === "Enter" && stateSelect.value) window.location = `?location=${encodeURIComponent(stateSelect.value)}`;
        });

        if (natStats) renderFunFacts(natStats);
    })();
    throw new Error("No location");
}

// ── Fun facts (index page) ─────────────────────────────────────────────────
function renderFunFacts(stats) {
    const el = document.getElementById("fun-facts");
    if (!el) return;
    const rankings = stats.state_rankings || [];
    const items = stats.items || {};
    const ff = stats.fun_facts || {};
    const facts = [];

    if (rankings.length) {
        const cheapest = rankings[0];
        const priciest = rankings[rankings.length - 1];
        facts.push({ icon: "🏆", title: "Cheapest State", body: `<b>${cheapest.name}</b><br><small>${(cheapest.price_index * 100).toFixed(0)}% of national avg · ${cheapest.stores} stores</small>` });
        facts.push({ icon: "💸", title: "Most Expensive State", body: `<b>${priciest.name}</b><br><small>${(priciest.price_index * 100).toFixed(0)}% of national avg · ${priciest.stores} stores</small>` });
    }

    const spread = (ff.most_spread || [])[0];
    if (spread) {
        facts.push({ icon: "📊", title: "Biggest Price Gap", body: `<b>${spread.name}</b><br><small>$${(spread.min/100).toFixed(2)} (${spread.min_state}) → $${(spread.max/100).toFixed(2)} (${spread.max_state}) · ${spread.spread_pct.toFixed(0)}% spread</small>` });
    }

    const bigMacName = Object.keys(items).find(n => /^big mac$/i.test(n.trim()));
    if (bigMacName) {
        const bm = items[bigMacName];
        facts.push({ icon: "🍔", title: "Big Mac Price Range", body: `<b>$${(bm.min/100).toFixed(2)} → $${(bm.max/100).toFixed(2)}</b><br><small>Cheapest in ${bm.min_state}, priciest in ${bm.max_state}</small>` });
    }

    const expItem = (ff.most_expensive_items || [])[0];
    if (expItem) {
        facts.push({ icon: "🤑", title: "Most Expensive Item", body: `<b>${expItem.name}</b><br><small>avg $${(expItem.avg/100).toFixed(2)} · up to $${(expItem.max/100).toFixed(2)} in ${expItem.max_state}</small>` });
    }

    const cheapItem = (ff.cheapest_items || [])[0];
    if (cheapItem) {
        facts.push({ icon: "💰", title: "Cheapest Item", body: `<b>${cheapItem.name}</b><br><small>avg $${(cheapItem.avg/100).toFixed(2)} · as low as $${(cheapItem.min/100).toFixed(2)} in ${cheapItem.min_state}</small>` });
    }

    facts.push({ icon: "🏪", title: "Stores Tracked", body: `<b>${(stats.stores_with_menus || stats.total_stores || 0).toLocaleString()}</b> locations<br><small>${(stats.total_items || 0).toLocaleString()} unique menu items</small>` });

    el.innerHTML = `<h3>🇺🇸 National Highlights</h3><div class="facts-grid">${
        facts.map(f => `<div class="fact-card"><div class="fact-icon">${f.icon}</div><div class="fact-title">${f.title}</div><div class="fact-body">${f.body}</div></div>`).join("")
    }</div>`;
    el.style.display = "";
}

const appLocation = params.get("location");
substituteLocationString(appLocation);
document.getElementById("index-page").style.display = "none";
document.getElementById("app-page").style.display = "";

const isNational = appLocation === "United States";

// ── Helpers ───────────────────────────────────────────────────────────────
function redGreen(value, min, max) {
    if (min === max) return "transparent";
    const r = (value - min) / (max - min);
    return `rgba(${Math.round(255*r)},${Math.round(255*(1-r))},0,0.55)`;
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 3958.8, d2r = Math.PI / 180;
    const dLat = (lat2-lat1)*d2r, dLon = (lon2-lon1)*d2r;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function geocodeZip(zip) {
    const r = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=us&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    return d.length ? { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) } : null;
}

function parseCents(val) {
    if (!val || val === "") return [];
    return val.split("/").map(Number).filter(n => !isNaN(n) && n > 0);
}

// Category detection from item name
function getCategory(name) {
    const n = name.toLowerCase();
    if (/mcchicken|chicken|nugget|mccrispy|crispy|tender|popcorn/.test(n)) return "chicken";
    if (/big mac|quarter pounder|mcdouble|double|burger|cheeseburger|hamburger|patty|beef/.test(n)) return "burgers";
    if (/filet.o.fish|fish fillet/.test(n)) return "fish";
    if (/coffee|latte|cappuccino|espresso|frappe|shake|smoothie|coke|sprite|fanta|tea|drink|beverage|juice|water|hi.c|slushie|oreo mcflurry|mcflurry/.test(n)) return "drinks";
    if (/egg|mcmuffin|biscuit|sausage|hotcake|pancake|hash brown|breakfast|burrito|bagel/.test(n)) return "breakfast";
    if (/fry|fries|side salad|apple|mozzarella|cookie|pie|sundae|soft baked/.test(n) && !/meal/.test(n)) return "sides";
    if (/mcflurry|sundae|cone|flurry|soft serve|pie|cookie|brownie|cake/.test(n)) return "desserts";
    return "other";
}

// Fuzzy match
function fuzzyScore(query, name) {
    const q = query.toLowerCase().trim();
    const n = name.toLowerCase();
    if (n === q) return 1.0;
    if (n.includes(q)) return 0.9;
    const qWords = q.split(/\s+/);
    const nWords = n.split(/\s+/);
    const hits = qWords.filter(w => nWords.some(nw => nw.startsWith(w) || w.startsWith(nw))).length;
    return hits / Math.max(qWords.length, nWords.length) * 0.8;
}

// ── Calorie lookup ────────────────────────────────────────────────────────
// Source: McDonald's US nutrition data (publicly published)
const CAL_MAP = [
    [/big mac sandwich$|^big mac$/, 590],
    [/mcdouble/, 400],
    [/double quarter pounder with cheese/, 740],
    [/quarter pounder with cheese$/, 520],
    [/quarter pounder$/, 410],
    [/double cheeseburger/, 450],
    [/cheeseburger$/, 300],
    [/hamburger$/, 250],
    [/spicy crispy chicken sandwich/, 530],
    [/deluxe crispy chicken sandwich/, 530],
    [/crispy chicken sandwich$/, 470],
    [/spicy mcchicken/, 400],
    [/mcchicken$/, 400],
    [/filet.o.fish/, 380],
    [/40\s*piece.*nugget|nugget.*40\s*piece/, 1770],
    [/20\s*piece.*nugget|nugget.*20\s*piece/, 890],
    [/10\s*piece.*nugget|nugget.*10\s*piece/, 440],
    [/6\s*piece.*nugget|nugget.*6\s*piece/, 260],
    [/4\s*piece.*nugget|nugget.*4\s*piece/, 180],
    [/3\s*piece.*tender/, 350],
    [/large\s*french fries|french fries\s*large/, 490],
    [/medium\s*french fries|french fries\s*medium/, 320],
    [/small\s*french fries|french fries\s*small/, 230],
    [/large\s*fries|fries\s*large/, 490],
    [/medium\s*fries|fries\s*medium/, 320],
    [/small\s*fries|fries\s*small/, 230],
    [/sausage mcmuffin with egg/, 480],
    [/sausage mcmuffin$/, 400],
    [/egg mcmuffin$/, 310],
    [/bacon egg.*cheese.*biscuit/, 460],
    [/sausage egg.*cheese.*biscuit/, 560],
    [/sausage biscuit$/, 460],
    [/hash brown$/, 150],
    [/hotcakes$/, 590],
    [/big breakfast$/, 760],
    [/mcflurry.*oreo/, 690],
    [/mcflurry.*m.m/, 680],
    [/mcflurry/, 680],
    [/vanilla soft serve cone|soft serve cone/, 200],
    [/hot fudge sundae/, 330],
    [/caramel sundae/, 340],
    [/baked apple pie/, 240],
    [/chocolate chip cookie/, 170],
    [/oatmeal raisin cookie/, 150],
    [/apple slices$/, 15],
    [/side salad$/, 15],
    [/fruit.*yogurt parfait/, 210],
];

function lookupCalories(name) {
    const n = name.toLowerCase().trim();
    for (const [pat, cal] of CAL_MAP) {
        if (pat.test(n)) return cal;
    }
    return null;
}

// ══════════════════════════════════════════════════════════════════════════
// NATIONAL VIEW
// ══════════════════════════════════════════════════════════════════════════
if (isNational) {
    (async () => {
        const natStats = await fetch("national_stats.json").then(r => r.json()).catch(() => null);
        if (!natStats) {
            document.getElementById("table-body").innerHTML =
                `<tr><td colspan="10" style="color:red">⚠ national_stats.json not found. Run generate_national_stats.py first.</td></tr>`;
            return;
        }

        const items = natStats.items || {};
        const stateRankings = natStats.state_rankings || [];
        const stateStats = natStats.state_stats || {};

        // Hide zip filter (not relevant for national view)
        document.querySelector(".control-group:has(#zip-input)").style.display = "none";
        document.querySelector(".control-group:has(#rank-btn)").style.display = "none";
        document.querySelector(".control-group:has(#order-input)").style.display = "none";

        // Update status
        document.getElementById("total-restaurants").textContent = (natStats.stores_with_menus || natStats.total_stores || 0).toLocaleString();

        // Show state rankings panel
        const summaryEl = document.getElementById("order-summary");
        summaryEl.innerHTML = buildStateRankingsHtml(stateRankings, stateStats);
        summaryEl.style.display = "";

        // Build item rows from natStats.items
        let itemList = Object.entries(items).map(([name, d]) => ({
            name,
            category: getCategory(name),
            cal: lookupCalories(name),
            min: d.min,
            min_nsn: d.min_nsn,
            min_state: d.min_state,
            min_addr: d.min_addr,
            max: d.max,
            max_nsn: d.max_nsn,
            max_state: d.max_state,
            max_addr: d.max_addr,
            avg: d.avg,
            count: d.count,
            spread_pct: d.spread_pct,
        }));

        let activeCategory = "all";
        let itemSearch = "";
        let natSort = { col: "spread_pct", dir: "desc" };

        function getFilteredItems() {
            return itemList.filter(item => {
                if (activeCategory !== "all" && item.category !== activeCategory) return false;
                if (itemSearch && !item.name.toLowerCase().includes(itemSearch)) return false;
                return true;
            });
        }

        function sortItems(list) {
            const { col, dir } = natSort;
            return [...list].sort((a, b) => {
                const av = a[col] ?? (col === "cal_per_dollar" ? calPerDollar(a) : null);
                const bv = b[col] ?? (col === "cal_per_dollar" ? calPerDollar(b) : null);
                if (av === null && bv === null) return 0;
                if (av === null) return 1;
                if (bv === null) return -1;
                if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                return dir === "asc" ? av - bv : bv - av;
            });
        }

        function calPerDollar(item) {
            if (!item.cal || !item.avg) return null;
            return Math.round(item.cal / (item.avg / 100) * 10) / 10;
        }

        function renderNationalTable() {
            const filtered = sortItems(getFilteredItems());
            document.getElementById("visible-restaurants").textContent = filtered.length;
            document.getElementById("status-extra").textContent = `items nationwide`;

            const cols = [
                { key: "name", label: "Item", fmt: (v, item) => `<span title="${item.name}">${item.name}</span>` },
                { key: "min", label: "Min $", fmt: (v) => `$${(v/100).toFixed(2)}` },
                { key: "min_addr", label: "Cheapest Location", fmt: (v, item) =>
                    `<a href="https://www.mcdonalds.com/us/en-us/location/${item.min_nsn}.html" target="_blank">${shortAddr(v)}</a> <span class="state-badge">${item.min_state}</span>` },
                { key: "max", label: "Max $", fmt: (v) => `$${(v/100).toFixed(2)}` },
                { key: "max_addr", label: "Priciest Location", fmt: (v, item) =>
                    `<a href="https://www.mcdonalds.com/us/en-us/location/${item.max_nsn}.html" target="_blank">${shortAddr(v)}</a> <span class="state-badge">${item.max_state}</span>` },
                { key: "avg", label: "Avg $", fmt: (v) => `$${(v/100).toFixed(2)}` },
                { key: "spread_pct", label: "Spread", fmt: (v) => v > 0 ? `${v.toFixed(0)}%` : `–` },
                { key: "cal", label: "Cal", fmt: (v) => v != null ? v : `–` },
                { key: "cal_per_dollar", label: "Cal/$", fmt: (v, item) => {
                    const c = calPerDollar(item);
                    return c != null ? `<span class="cal-score" title="${item.cal} cal ÷ $${(item.avg/100).toFixed(2)}">${c}</span>` : `–`;
                }},
                { key: "count", label: "# Stores", fmt: (v) => v.toLocaleString() },
            ];

            // Header
            const headerHtml = `<th>Cat</th>` + cols.map(c => {
                const sorted = natSort.col === c.key;
                const arrow = sorted ? (natSort.dir === "asc" ? " ▲" : " ▼") : "";
                return `<th class="sortable-col nat-col-${c.key}" data-col="${c.key}" style="cursor:pointer">${c.label}${arrow}</th>`;
            }).join("");
            document.getElementById("table-header").innerHTML = headerHtml;
            document.querySelectorAll("#table-header .sortable-col").forEach(th => {
                th.addEventListener("click", () => {
                    const col = th.dataset.col;
                    if (natSort.col === col) {
                        natSort = natSort.dir === "asc" ? { col, dir: "desc" } : { col: "spread_pct", dir: "desc" };
                    } else {
                        natSort = { col, dir: col === "name" ? "asc" : "desc" };
                    }
                    renderNationalTable();
                });
            });

            // Compute cal/dollar range for color coding
            const calScores = filtered.map(calPerDollar).filter(v => v != null);
            const calMin = calScores.length ? Math.min(...calScores) : 0;
            const calMax = calScores.length ? Math.max(...calScores) : 1;

            // Spread range for color
            const spreads = filtered.map(i => i.spread_pct).filter(v => v > 0);
            const spreadMax = spreads.length ? Math.max(...spreads) : 100;

            const EMOJI = { chicken: "🍗", burgers: "🍔", fish: "🐟", drinks: "🥤", breakfast: "🥞", sides: "🍟", desserts: "🍦", other: "•" };

            const rows = filtered.map(item => {
                const cpd = calPerDollar(item);
                const cells = cols.map(c => {
                    let val = item[c.key];
                    let display = c.fmt(val, item);
                    let style = "";
                    if (c.key === "spread_pct" && val > 0) {
                        const intensity = val / spreadMax;
                        style = `background:rgba(255,${Math.round(220*(1-intensity))},0,0.4)`;
                    }
                    if (c.key === "cal_per_dollar" && cpd != null) {
                        style = `background:${redGreen(cpd, calMin, calMax)}`;
                    }
                    if (c.key === "min") style = "color:#2e7d32;font-weight:600";
                    if (c.key === "max") style = "color:#b71c1c;font-weight:600";
                    return `<td style="${style}">${display}</td>`;
                }).join("");
                return `<tr><td style="text-align:center;font-size:1rem">${EMOJI[item.category] || "•"}</td>${cells}</tr>`;
            }).join("");

            document.getElementById("table-body").innerHTML = rows;
        }

        function shortAddr(addr) {
            if (!addr) return "N/A";
            const parts = addr.split(",");
            return parts[0].trim();
        }

        // Category filter
        document.getElementById("category-chips").addEventListener("click", e => {
            const chip = e.target.closest(".chip");
            if (!chip) return;
            activeCategory = chip.dataset.cat;
            document.querySelectorAll("#category-chips .chip").forEach(c => c.classList.toggle("active", c === chip));
            renderNationalTable();
        });

        // Item search
        let searchTimeout;
        document.getElementById("filter").addEventListener("input", e => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { itemSearch = e.target.value.toLowerCase(); renderNationalTable(); }, 350);
        });

        // Price filter
        document.getElementById("price-filter").addEventListener("change", e => {
            const mode = e.target.value;
            document.getElementById("price-range-inputs").style.display = mode === "range" ? "flex" : "none";
            // For national view: filter items by min price range
            if (mode !== "range") {
                if (mode === "lowest") { natSort = { col: "min", dir: "asc" }; }
                else if (mode === "highest") { natSort = { col: "max", dir: "desc" }; }
                renderNationalTable();
            }
        });
        document.getElementById("price-range-btn").addEventListener("click", () => {
            const minD = parseFloat(document.getElementById("price-min").value) || null;
            const maxD = parseFloat(document.getElementById("price-max").value) || null;
            if (minD !== null || maxD !== null) {
                itemList = Object.entries(items).map(([name, d]) => ({
                    name, category: getCategory(name), cal: lookupCalories(name),
                    min: d.min, min_nsn: d.min_nsn, min_state: d.min_state, min_addr: d.min_addr,
                    max: d.max, max_nsn: d.max_nsn, max_state: d.max_state, max_addr: d.max_addr,
                    avg: d.avg, count: d.count, spread_pct: d.spread_pct,
                })).filter(item => {
                    if (minD !== null && item.min / 100 < minD) return false;
                    if (maxD !== null && item.max / 100 > maxD) return false;
                    return true;
                });
                renderNationalTable();
            }
        });

        renderNationalTable();
    })();
    throw new Error("National view loaded");
}

function buildStateRankingsHtml(rankings, stateStats) {
    const rows = rankings.map((s, i) => {
        const pct = (s.price_index * 100).toFixed(1);
        const bar = Math.round(s.price_index * 60);
        const color = s.price_index < 1 ? "#2e7d32" : s.price_index > 1.05 ? "#b71c1c" : "#f57c00";
        return `<tr>
            <td>#${i+1}</td>
            <td><b>${s.name}</b></td>
            <td>${s.stores.toLocaleString()}</td>
            <td><span class="price-index-bar" style="width:${bar}px;background:${color}"></span> ${pct}%</td>
        </tr>`;
    }).join("");
    return `<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:flex-start">
        <div style="flex:1;min-width:280px">
            <h4 style="margin:0 0 0.5rem">🏆 State Price Rankings</h4>
            <p style="font-size:0.8rem;opacity:0.7;margin:0 0 0.5rem">Price index: % of national average. Under 100% = cheaper than average.</p>
            <div style="max-height:300px;overflow-y:auto">
            <table class="ranking-table"><thead><tr><th>#</th><th>State</th><th>Stores</th><th>Price Index</th></tr></thead>
            <tbody>${rows}</tbody></table>
            </div>
        </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// PER-STATE VIEW (existing logic)
// ══════════════════════════════════════════════════════════════════════════
(async () => {
    const lang = document.documentElement.lang;
    const priceFile = lang === "fr-CA" ? "prices_fr-CA.csv" : lang === "en-CA" ? "prices_en-CA.csv" : "prices_en-US.csv";
    const colHeaders = lang === "fr-CA" ? ["Resto", "Adresse"] : ["NSN", "Address"];

    const [locText, pricesText, storesText, addresses] = await Promise.all([
        fetch(`data/${appLocation}/localization.csv`).then(r => {
            if (!r.ok) throw new Error(`localization.csv not found`);
            return r.text();
        }),
        fetch(`data/${appLocation}/${priceFile}`).then(r => {
            if (!r.ok) throw new Error(`${priceFile} not found`);
            return r.text();
        }),
        fetch(`data/${appLocation}/stores.csv`).then(r => r.ok ? r.text() : "").catch(() => ""),
        fetch("addresses.json").then(r => r.json()).catch(() => ({})),
    ]).catch(err => {
        document.getElementById("table-body").innerHTML =
            `<tr><td colspan="3" style="color:red">⚠️ ${err.message}</td></tr>`;
        throw err;
    });

    const localization = Papa.parse(locText, { header: true }).data;
    const priceRows = Papa.parse(pricesText, { header: true }).data;
    const allNsns = Object.keys(priceRows[0]).filter(k => k !== "any");

    const storesMeta = {};
    if (storesText) {
        Papa.parse(storesText, { header: true }).data.forEach(row => {
            if (row.nsn) storesMeta[row.nsn] = {
                lat: parseFloat(row.lat) || null,
                lon: parseFloat(row.lon) || null,
                address: row.address || "",
            };
        });
    }

    const catalog = priceRows.map((row, i) => {
        if (!row.any) return null;
        const locRow = localization[i] || {};
        const name = (locRow[lang] || locRow["en-US"] || locRow["en-CA"] || locRow.name || `Item ${i}`).trim();
        const pricesObj = {};
        allNsns.forEach(nsn => { if (row[nsn]) pricesObj[nsn] = row[nsn]; });
        return { name, category: getCategory(name), cal: lookupCalories(name), pricesObj, rowIdx: i };
    }).filter(Boolean);

    document.getElementById("total-restaurants").textContent = allNsns.length;

    let visibleNsns = [...allNsns];
    let activeCategory = "all";
    let itemSearch = "";
    let priceFilterMode = "none";
    let priceMin = null, priceMax = null;
    let orderItems = [];
    let showOnlyOrder = false;
    let rankMode = false;
    let rankOrder = null;
    let colSort = null;

    function getVisibleItems() {
        return catalog.filter(item => {
            if (showOnlyOrder && orderItems.length) {
                if (!orderItems.some(o => o.rowIdx === item.rowIdx)) return false;
            }
            if (activeCategory !== "all" && item.category !== activeCategory) return false;
            if (itemSearch && !item.name.toLowerCase().includes(itemSearch)) return false;
            return true;
        });
    }

    function renderTable() {
        const items = getVisibleItems();
        const nsns = rankMode && rankOrder ? rankOrder.filter(n => visibleNsns.includes(n)) : visibleNsns;

        const forceShow = showOnlyOrder || activeCategory !== "all" || itemSearch || priceFilterMode !== "none";
        const displayed = items.filter(item => {
            const cents = nsns.flatMap(n => parseCents(item.pricesObj[n]));
            if (!cents.length) return false;
            if (priceFilterMode === "range" && priceMin !== null && priceMax !== null) {
                const minD = Math.min(...cents)/100, maxD = Math.max(...cents)/100;
                if (maxD < priceMin || minD > priceMax) return false;
            }
            if (!forceShow && Math.min(...cents) === Math.max(...cents)) return false;
            return true;
        });

        const orderRowIndices = new Set(orderItems.map(o => o.rowIdx));
        const orderColIndices = new Set(displayed.map((item, ci) => orderRowIndices.has(item.rowIdx) ? ci : -1).filter(x => x >= 0));

        // Cal/$ row for items with calorie data
        const hasCalData = displayed.some(item => item.cal != null);

        const headerCells = colHeaders.map(h => `<th>${h}</th>`).join("") +
            displayed.map((item, ci) => {
                const isOrder = orderColIndices.has(ci);
                const isSorted = colSort && colSort.itemRowIdx === item.rowIdx;
                const arrow = isSorted ? (colSort.dir === "asc" ? " ▲" : " ▼") : "";
                const calStr = item.cal != null ? `<br><small style="opacity:0.6">${item.cal} cal</small>` : "";
                return `<th class="${isOrder ? "order-col " : ""}sortable-col" data-ridx="${item.rowIdx}" style="cursor:pointer" title="Click to sort by price">${item.name}${arrow}${calStr}</th>`;
            }).join("");
        document.getElementById("table-header").innerHTML = headerCells;

        document.querySelectorAll("#table-header .sortable-col").forEach(th => {
            th.addEventListener("click", () => {
                const ridx = parseInt(th.dataset.ridx);
                if (colSort && colSort.itemRowIdx === ridx) {
                    colSort = colSort.dir === "asc" ? { itemRowIdx: ridx, dir: "desc" } : null;
                } else {
                    colSort = { itemRowIdx: ridx, dir: "asc" };
                }
                rankMode = false; rankOrder = null;
                renderTable();
            });
        });

        const globalStats = displayed.map(item => {
            const cents = visibleNsns.flatMap(n => parseCents(item.pricesObj[n]));
            return cents.length ? { min: Math.min(...cents), max: Math.max(...cents) } : { min: 0, max: 0 };
        });

        // Cal/$ per item (using avg price across visible stores)
        const calPerDollarStats = displayed.map(item => {
            if (!item.cal) return null;
            const cents = visibleNsns.flatMap(n => parseCents(item.pricesObj[n]));
            if (!cents.length) return null;
            const avg = cents.reduce((a,b)=>a+b,0)/cents.length;
            return Math.round(item.cal / (avg / 100) * 10) / 10;
        });

        const summaryRows = ["MIN", "MAX", "DIFF", ...(hasCalData ? ["CAL/$"] : [])];
        let html = summaryRows.map(label => {
            const vals = displayed.map((item, ci) => {
                const { min, max } = globalStats[ci];
                if (!min && !max) return `<td class="na-cell">–</td>`;
                if (label === "MIN") return `<td>$${(min/100).toFixed(2)}</td>`;
                if (label === "MAX") return `<td>$${(max/100).toFixed(2)}</td>`;
                if (label === "DIFF") {
                    if (min === max) return `<td class="na-cell">–</td>`;
                    const pct = ((max-min)/((max+min)/2)*100).toFixed(1);
                    return `<td>${pct}%</td>`;
                }
                if (label === "CAL/$") {
                    const cpd = calPerDollarStats[ci];
                    return cpd != null ? `<td><small>${cpd}</small></td>` : `<td class="na-cell">–</td>`;
                }
                return `<td>–</td>`;
            }).join("");
            return `<tr class="summary-row"><td><b>${label}</b></td><td></td>${vals}</tr>`;
        }).join("") + `<tr class="divider-row"><td colspan="${2 + displayed.length}"></td></tr>`;

        let displayedNsns;
        if (colSort) {
            const sortItem = catalog.find(c => c.rowIdx === colSort.itemRowIdx);
            displayedNsns = [...visibleNsns].sort((a, b) => {
                const aC = sortItem ? parseCents(sortItem.pricesObj[a]) : [];
                const bC = sortItem ? parseCents(sortItem.pricesObj[b]) : [];
                const aVal = aC.length ? Math.min(...aC) : Infinity;
                const bVal = bC.length ? Math.min(...bC) : Infinity;
                if (aVal === Infinity && bVal === Infinity) return 0;
                if (aVal === Infinity) return 1;
                if (bVal === Infinity) return -1;
                return colSort.dir === "asc" ? aVal - bVal : bVal - aVal;
            });
        } else if (rankMode && rankOrder) {
            displayedNsns = rankOrder.filter(n => visibleNsns.includes(n));
        } else {
            displayedNsns = visibleNsns;
        }

        displayedNsns.forEach(nsn => {
            const addrEntry = addresses[nsn] || {};
            const storeMeta = storesMeta[nsn] || {};
            const addr = addrEntry.addr || storeMeta.address || "N/A";
            const storeUrl = lang.startsWith("en-US")
                ? `https://www.mcdonalds.com/us/en-us/location/${nsn}.html`
                : `https://www.mcdonalds.com/ca/${lang.toLowerCase()}/location/${nsn}.html`;

            const itemCells = displayed.map((item, ci) => {
                const raw = item.pricesObj[nsn];
                const isOrderCol = orderColIndices.has(ci);
                if (!raw) return `<td class="na-cell${isOrderCol ? " order-col" : ""}">–</td>`;
                const cents = parseCents(raw);
                if (!cents.length) return `<td class="na-cell${isOrderCol ? " order-col" : ""}">–</td>`;
                const { min, max } = globalStats[ci];
                const avg = cents.reduce((a,b)=>a+b,0)/cents.length;
                let bg = "transparent";
                if (min !== max) {
                    if (priceFilterMode === "lowest") bg = Math.min(...cents) === min ? "rgba(0,200,0,0.35)" : "transparent";
                    else if (priceFilterMode === "highest") bg = Math.max(...cents) === max ? "rgba(200,0,0,0.35)" : "transparent";
                    else bg = redGreen(avg, min, max);
                }
                const display = cents.map(c => "$"+(c/100).toFixed(2)).join("/");
                return `<td class="${isOrderCol ? "order-col" : ""}" style="background:${bg}">${display}</td>`;
            }).join("");

            html += `<tr>
                <td><a href="${storeUrl}" target="_blank">${nsn}</a></td>
                <td title="${addr}">${addr}</td>
                ${itemCells}
            </tr>`;
        });

        document.getElementById("table-body").innerHTML = html;
        document.getElementById("visible-restaurants").textContent = displayedNsns.length;
        document.getElementById("status-extra").textContent =
            `${displayed.length} item${displayed.length !== 1 ? "s" : ""} shown`;
    }

    function computeOrderTotal(nsn) {
        let total = 0, missing = 0;
        orderItems.forEach(o => {
            const item = catalog.find(c => c.rowIdx === o.rowIdx);
            if (!item) { missing++; return; }
            const cents = parseCents(item.pricesObj[nsn]);
            if (!cents.length) { missing++; return; }
            total += Math.min(...cents);
        });
        return { total, missing };
    }

    function buildRanking() {
        if (!orderItems.length) return;
        const scored = visibleNsns.map(nsn => {
            const { total, missing } = computeOrderTotal(nsn);
            return { nsn, total, missing };
        }).filter(s => s.missing < orderItems.length);
        scored.sort((a, b) => a.missing - b.missing || a.total - b.total);
        rankOrder = scored.map(s => s.nsn);

        const top = scored.slice(0, 10);
        const summaryHtml = `<h4>🏆 Cheapest stores for your order</h4>
            <table class="ranking-table"><thead><tr>
                <th>Rank</th><th>Store</th><th>Address</th><th>Order Total</th><th>Missing items</th>
            </tr></thead><tbody>
            ${top.map((s, i) => {
                const addr = (addresses[s.nsn]?.addr || storesMeta[s.nsn]?.address || "").split(",")[0];
                return `<tr>
                    <td>#${i+1}</td>
                    <td><a href="https://www.mcdonalds.com/us/en-us/location/${s.nsn}.html" target="_blank">${s.nsn}</a></td>
                    <td>${addr}</td>
                    <td><strong>$${(s.total/100).toFixed(2)}</strong></td>
                    <td>${s.missing === 0 ? "✓ All items" : `⚠ ${s.missing} missing`}</td>
                </tr>`;
            }).join("")}
            </tbody></table>
            <small>Showing top ${top.length} of ${scored.length} stores. Table below sorted by cheapest order total.</small>`;
        document.getElementById("order-summary").innerHTML = summaryHtml;
        document.getElementById("order-summary").style.display = "";
    }

    function addOrderItem(name, rowIdx) {
        if (orderItems.some(o => o.rowIdx === rowIdx)) return;
        orderItems.push({ name, rowIdx });
        renderOrderChips();
        renderTable();
    }

    function renderOrderChips() {
        document.getElementById("order-chips").innerHTML = orderItems.map((o, i) =>
            `<span class="chip order-chip">${o.name}<span class="remove-item" data-i="${i}">✕</span></span>`
        ).join("");
        document.querySelectorAll(".remove-item").forEach(el => {
            el.addEventListener("click", () => {
                orderItems.splice(parseInt(el.dataset.i), 1);
                if (!orderItems.length) {
                    rankMode = false; rankOrder = null;
                    document.getElementById("order-summary").style.display = "none";
                }
                renderOrderChips();
                renderTable();
            });
        });
    }

    function showSuggestions(query) {
        const box = document.getElementById("order-suggestions");
        if (!query.trim()) { box.style.display = "none"; return; }
        const scored = catalog
            .map(item => ({ item, score: fuzzyScore(query, item.name) }))
            .filter(x => x.score > 0.2)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
        if (!scored.length) { box.style.display = "none"; return; }
        box.innerHTML = scored.map(({ item }) =>
            `<div class="suggestion-item" data-ridx="${item.rowIdx}" data-name="${item.name.replace(/"/g,'&quot;')}">${item.name}${item.cal ? ` <small style="opacity:0.6">${item.cal} cal</small>` : ""}</div>`
        ).join("");
        box.style.display = "";
        box.querySelectorAll(".suggestion-item").forEach(el => {
            el.addEventListener("click", () => {
                addOrderItem(el.dataset.name, parseInt(el.dataset.ridx));
                document.getElementById("order-input").value = "";
                box.style.display = "none";
            });
        });
    }

    const orderInput = document.getElementById("order-input");
    orderInput.addEventListener("input", e => showSuggestions(e.target.value));
    orderInput.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const q = orderInput.value.replace(/,$/, "").trim();
            if (!q) return;
            const best = catalog.map(item => ({ item, score: fuzzyScore(q, item.name) }))
                .sort((a,b) => b.score - a.score)[0];
            if (best && best.score > 0.3) {
                addOrderItem(best.item.name, best.item.rowIdx);
                orderInput.value = "";
                document.getElementById("order-suggestions").style.display = "none";
            }
        }
        if (e.key === "Escape") document.getElementById("order-suggestions").style.display = "none";
    });

    document.getElementById("order-add-btn").addEventListener("click", () => {
        const q = orderInput.value.trim();
        if (!q) return;
        const best = catalog.map(item => ({ item, score: fuzzyScore(q, item.name) }))
            .sort((a,b) => b.score - a.score)[0];
        if (best && best.score > 0.3) {
            addOrderItem(best.item.name, best.item.rowIdx);
            orderInput.value = "";
            document.getElementById("order-suggestions").style.display = "none";
        }
    });

    document.getElementById("order-clear-btn").addEventListener("click", () => {
        orderItems = [];
        rankMode = false; rankOrder = null;
        document.getElementById("order-summary").style.display = "none";
        renderOrderChips();
        renderTable();
    });

    document.getElementById("only-order-toggle").addEventListener("change", e => {
        showOnlyOrder = e.target.checked;
        renderTable();
    });

    document.getElementById("rank-btn").addEventListener("click", () => {
        if (!orderItems.length) { alert("Add items to your order first."); return; }
        rankMode = true;
        buildRanking();
        renderTable();
    });

    document.getElementById("category-chips").addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        activeCategory = chip.dataset.cat;
        document.querySelectorAll("#category-chips .chip").forEach(c => c.classList.toggle("active", c === chip));
        renderTable();
    });

    let searchTimeout;
    document.getElementById("filter").addEventListener("input", e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { itemSearch = e.target.value.toLowerCase(); renderTable(); }, 350);
    });

    async function applyZipFilter() {
        const zip = document.getElementById("zip-input").value.trim();
        const radius = parseFloat(document.getElementById("radius-input").value) || 25;
        if (!zip) return;
        const btn = document.getElementById("zip-btn");
        btn.textContent = "..."; btn.disabled = true;
        const geo = await geocodeZip(zip);
        btn.textContent = "Go"; btn.disabled = false;
        if (!geo) { alert(`Zip code not found: ${zip}`); return; }
        const filtered = allNsns.filter(nsn => {
            const m = storesMeta[nsn];
            return m && m.lat && m.lon && haversine(geo.lat, geo.lon, m.lat, m.lon) <= radius;
        });
        if (!filtered.length) { alert(`No stores within ${radius} miles of ${zip}.`); return; }
        visibleNsns = filtered;
        rankMode = false; rankOrder = null;
        document.getElementById("order-summary").style.display = "none";
        renderTable();
    }
    document.getElementById("zip-btn").addEventListener("click", applyZipFilter);
    document.getElementById("zip-input").addEventListener("keydown", e => { if (e.key === "Enter") applyZipFilter(); });
    document.getElementById("zip-clear").addEventListener("click", () => {
        document.getElementById("zip-input").value = "";
        visibleNsns = [...allNsns];
        rankMode = false; rankOrder = null;
        document.getElementById("order-summary").style.display = "none";
        renderTable();
    });

    document.getElementById("price-filter").addEventListener("change", e => {
        priceFilterMode = e.target.value;
        document.getElementById("price-range-inputs").style.display = priceFilterMode === "range" ? "flex" : "none";
        if (priceFilterMode !== "range") renderTable();
    });
    document.getElementById("price-range-btn").addEventListener("click", () => {
        priceMin = parseFloat(document.getElementById("price-min").value) || null;
        priceMax = parseFloat(document.getElementById("price-max").value) || null;
        renderTable();
    });

    document.addEventListener("click", e => {
        if (!e.target.closest("#order-input") && !e.target.closest(".suggestions-box"))
            document.getElementById("order-suggestions").style.display = "none";
    });

    renderTable();
})();
