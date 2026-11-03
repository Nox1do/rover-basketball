// ==UserScript==
// @name         CBB Espn-Fox
// @namespace    https://roversport.net/
// @version      0.0.4
// @description  NCAA masculino: ESPN + validación FOX; H1→Q2, H2→Q4, OT y Final. Firefox/Tampermonkey.
// @author       noeg
// @match        https://www.roversport.net/adm/es/*
// @match        https://roversport.net/adm/es/*
// @match        https://www.roversport.lol/adm/es/*
// @match        https://roversport.lol/adm/es/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      site.api.espn.com
// @connect      api.foxsports.com
// @run-at       document-idle
// ==/UserScript==

(() => {
    "use strict";

    const VERSION = "0.0.4";
    const TAG = "[CBB Espn-Fox]";

    /*
     * Rover no refresca #tablaEventos al cambiar CATEGORY/LEAGUE/DATE;
     * el usuario debe pulsar Search. Mientras eso no ocurra, la tabla y
     * #resEditContainer pueden seguir mostrando eventos de la liga anterior.
     */
    const contextGate = {
        signature: "",
        dirty: false,
        searchRequested: false,
        staleFingerprint: "",
        staleRows: [],
        watchToken: 0
    };

    // ============================================================
    // MOD 01 - MAPA ROVER COD -> ESPN + FOX TEAM ID
    // 287 códigos Rover con equivalencia ESPN y FOX CBB; California Baptist actualizado a 984 en 0.0.4.
    // ============================================================

    const TEAM_MAP = {
        "133": {"rover_name":"Lindenwood","espn_id":"2815","espn_name":"Lindenwood Lions","fox_id":"1130","fox_name":"Lindenwood Lions"},
        "135": {"rover_name":"Utah Tech","espn_id":"3101","espn_name":"Utah Tech Trailblazers","fox_id":"1181","fox_name":"Utah Tech Trailblazers"},
        "176": {"rover_name":"St. Thomas-Minnesota","espn_id":"2900","espn_name":"St. Thomas Tommies","fox_id":"573","fox_name":"St. Thomas Tommies"},
        "179": {"rover_name":"Southern Indiana","espn_id":"88","espn_name":"Southern Indiana Screaming Eagles","fox_id":"990","fox_name":"Southern Indiana Screaming Eagles"},
        "254": {"rover_name":"Southeast Missouri St","espn_id":"2546","espn_name":"Southeast Missouri State Redhawks","fox_id":"216","fox_name":"Southeast Missouri State Redhawks"},
        "270": {"rover_name":"Le Moyne","espn_id":"2330","espn_name":"Le Moyne Dolphins","fox_id":"966","fox_name":"Le Moyne Dolphins"},
        "277": {"rover_name":"Saint Josephs","espn_id":"2603","espn_name":"Saint Joseph's Hawks","fox_id":"18","fox_name":"Saint Joseph's Hawks"},
        "285": {"rover_name":"New Haven","espn_id":"2441","espn_name":"New Haven Chargers","fox_id":"390","fox_name":"New Haven Chargers"},
        "300": {"rover_name":"East Texas A&M C","espn_id":"2837","espn_name":"East Texas A&M Lions","fox_id":"854","fox_name":"East Texas A&M Lions"},
        "381": {"rover_name":"West Georgia","espn_id":"2698","espn_name":"West Georgia Wolves","fox_id":"442","fox_name":"West Georgia Wolves"},
        "382": {"rover_name":"Mercyhurst","espn_id":"2385","espn_name":"Mercyhurst Lakers","fox_id":"459","fox_name":"Mercyhurst Lakers"},
        "388": {"rover_name":"Bellarmine","espn_id":"91","espn_name":"Bellarmine Knights","fox_id":"908","fox_name":"Bellarmine Knights"},
        "400": {"rover_name":"Florida Gulf Coast","espn_id":"526","espn_name":"Florida Gulf Coast Eagles","fox_id":"892","fox_name":"Florida Gulf Coast Eagles"},
        "581": {"rover_name":"St. Marys CA","espn_id":"2608","espn_name":"Saint Mary's Gaels","fox_id":"307","fox_name":"Saint Mary's Gaels"},
        "632": {"rover_name":"Binghamton","espn_id":"2066","espn_name":"Binghamton Bearcats","fox_id":"478","fox_name":"Binghamton Bearcats"},
        "633": {"rover_name":"Boston University","espn_id":"104","espn_name":"Boston University Terriers","fox_id":"1","fox_name":"Boston University Terriers"},
        "635": {"rover_name":"Maine","espn_id":"311","espn_name":"Maine Black Bears","fox_id":"6","fox_name":"Maine Black Bears"},
        "636": {"rover_name":"New Hampshire","espn_id":"160","espn_name":"New Hampshire Wildcats","fox_id":"7","fox_name":"New Hampshire Wildcats"},
        "638": {"rover_name":"UMBC","espn_id":"2378","espn_name":"UMBC Retrievers","fox_id":"202","fox_name":"UMBC Retrievers"},
        "639": {"rover_name":"Vermont","espn_id":"261","espn_name":"Vermont Catamounts","fox_id":"10","fox_name":"Vermont Catamounts"},
        "640": {"rover_name":"Boston College","espn_id":"103","espn_name":"Boston College Eagles","fox_id":"53","fox_name":"Boston College Eagles"},
        "641": {"rover_name":"Clemson","espn_id":"228","espn_name":"Clemson Tigers","fox_id":"22","fox_name":"Clemson Tigers"},
        "642": {"rover_name":"Duke","espn_id":"150","espn_name":"Duke Blue Devils","fox_id":"23","fox_name":"Duke Blue Devils"},
        "643": {"rover_name":"Florida State","espn_id":"52","espn_name":"Florida State Seminoles","fox_id":"24","fox_name":"Florida State Seminoles"},
        "644": {"rover_name":"Georgia Tech","espn_id":"59","espn_name":"Georgia Tech Yellow Jackets","fox_id":"25","fox_name":"Georgia Tech Yellow Jackets"},
        "645": {"rover_name":"Maryland","espn_id":"120","espn_name":"Maryland Terrapins","fox_id":"26","fox_name":"Maryland Terrapins"},
        "646": {"rover_name":"Miami (FL)","espn_id":"2390","espn_name":"Miami Hurricanes","fox_id":"55","fox_name":"Miami (FL) Hurricanes"},
        "647": {"rover_name":"NC State","espn_id":"152","espn_name":"NC State Wolfpack","fox_id":"28","fox_name":"NC State Wolfpack"},
        "648": {"rover_name":"North Carolina","espn_id":"153","espn_name":"North Carolina Tar Heels","fox_id":"27","fox_name":"North Carolina Tar Heels"},
        "649": {"rover_name":"Virginia","espn_id":"258","espn_name":"Virginia Cavaliers","fox_id":"29","fox_name":"Virginia Cavaliers"},
        "650": {"rover_name":"Virginia Tech","espn_id":"259","espn_name":"Virginia Tech Hokies","fox_id":"59","fox_name":"Virginia Tech Hokies"},
        "651": {"rover_name":"Wake Forest","espn_id":"154","espn_name":"Wake Forest Demon Deacons","fox_id":"30","fox_name":"Wake Forest Demon Deacons"},
        "652": {"rover_name":"Belmont","espn_id":"2057","espn_name":"Belmont Bruins","fox_id":"134","fox_name":"Belmont Bruins"},
        "653": {"rover_name":"Campbell","espn_id":"2097","espn_name":"Campbell Fighting Camels","fox_id":"31","fox_name":"Campbell Fighting Camels"},
        "654": {"rover_name":"East Tenn St","espn_id":"2193","espn_name":"East Tennessee State Buccaneers","fox_id":"257","fox_name":"East Tennessee State Buccaneers"},
        "658": {"rover_name":"Lipscomb","espn_id":"288","espn_name":"Lipscomb Bisons","fox_id":"731","fox_name":"Lipscomb Bisons"},
        "660": {"rover_name":"North Florida","espn_id":"2454","espn_name":"North Florida Ospreys","fox_id":"394","fox_name":"North Florida Ospreys"},
        "661": {"rover_name":"USC Upstate","espn_id":"2908","espn_name":"South Carolina Upstate Spartans","fox_id":"415","fox_name":"USC Upstate Spartans"},
        "662": {"rover_name":"Stetson","espn_id":"56","espn_name":"Stetson Hatters","fox_id":"39","fox_name":"Stetson Hatters"},
        "663": {"rover_name":"Charlotte","espn_id":"2429","espn_name":"Charlotte 49ers","fox_id":"123","fox_name":"Charlotte 49ers"},
        "664": {"rover_name":"Dayton","espn_id":"2168","espn_name":"Dayton Flyers","fox_id":"21","fox_name":"Dayton Flyers"},
        "665": {"rover_name":"Duquesne","espn_id":"2184","espn_name":"Duquesne Dukes","fox_id":"11","fox_name":"Duquesne Dukes"},
        "666": {"rover_name":"Fordham","espn_id":"2230","espn_name":"Fordham Rams","fox_id":"12","fox_name":"Fordham Rams"},
        "667": {"rover_name":"George Washington","espn_id":"45","espn_name":"George Washington Revolutionaries","fox_id":"13","fox_name":"George Washington Revolutionaries"},
        "668": {"rover_name":"La Salle","espn_id":"2325","espn_name":"La Salle Explorers","fox_id":"14","fox_name":"La Salle Explorers"},
        "669": {"rover_name":"Massachusetts","espn_id":"113","espn_name":"Massachusetts Minutemen","fox_id":"15","fox_name":"UMass Minutemen"},
        "670": {"rover_name":"Rhode Island","espn_id":"227","espn_name":"Rhode Island Rams","fox_id":"16","fox_name":"Rhode Island Rams"},
        "671": {"rover_name":"Richmond","espn_id":"257","espn_name":"Richmond Spiders","fox_id":"110","fox_name":"Richmond Spiders"},
        "673": {"rover_name":"St. Bonaventure","espn_id":"179","espn_name":"St. Bonaventure Bonnies","fox_id":"17","fox_name":"St. Bonaventure Bonnies"},
        "674": {"rover_name":"Saint Louis","espn_id":"139","espn_name":"Saint Louis Billikens","fox_id":"124","fox_name":"Saint Louis Billikens"},
        "676": {"rover_name":"Xavier","espn_id":"2752","espn_name":"Xavier Musketeers","fox_id":"20","fox_name":"Xavier Musketeers"},
        "677": {"rover_name":"Cincinnati","espn_id":"2132","espn_name":"Cincinnati Bearcats","fox_id":"119","fox_name":"Cincinnati Bearcats"},
        "678": {"rover_name":"Connecticut","espn_id":"41","espn_name":"UConn Huskies","fox_id":"54","fox_name":"UConn Huskies"},
        "679": {"rover_name":"DePaul","espn_id":"305","espn_name":"DePaul Blue Demons","fox_id":"120","fox_name":"DePaul Blue Demons"},
        "680": {"rover_name":"Georgetown","espn_id":"46","espn_name":"Georgetown Hoyas","fox_id":"60","fox_name":"Georgetown Hoyas"},
        "681": {"rover_name":"Louisville","espn_id":"97","espn_name":"Louisville Cardinals","fox_id":"121","fox_name":"Louisville Cardinals"},
        "682": {"rover_name":"Marquette","espn_id":"269","espn_name":"Marquette Golden Eagles","fox_id":"122","fox_name":"Marquette Golden Eagles"},
        "684": {"rover_name":"Pittsburgh","espn_id":"221","espn_name":"Pittsburgh Panthers","fox_id":"62","fox_name":"Pittsburgh Panthers"},
        "685": {"rover_name":"Providence","espn_id":"2507","espn_name":"Providence Friars","fox_id":"56","fox_name":"Providence Friars"},
        "687": {"rover_name":"Seton Hall","espn_id":"2550","espn_name":"Seton Hall Pirates","fox_id":"64","fox_name":"Seton Hall Pirates"},
        "688": {"rover_name":"South Florida","espn_id":"58","espn_name":"South Florida Bulls","fox_id":"115","fox_name":"South Florida Bulls"},
        "689": {"rover_name":"St. Johns","espn_id":"2599","espn_name":"St. John's Red Storm","fox_id":"57","fox_name":"St. John's Red Storm"},
        "690": {"rover_name":"Syracuse","espn_id":"183","espn_name":"Syracuse Orange","fox_id":"65","fox_name":"Syracuse Orange"},
        "692": {"rover_name":"West Virginia","espn_id":"277","espn_name":"West Virginia Mountaineers","fox_id":"66","fox_name":"West Virginia Mountaineers"},
        "693": {"rover_name":"Eastern Washington","espn_id":"331","espn_name":"Eastern Washington Eagles","fox_id":"68","fox_name":"Eastern Washington Eagles"},
        "694": {"rover_name":"Idaho State","espn_id":"304","espn_name":"Idaho State Bengals","fox_id":"69","fox_name":"Idaho State Bengals"},
        "695": {"rover_name":"Montana","espn_id":"149","espn_name":"Montana Grizzlies","fox_id":"70","fox_name":"Montana Grizzlies"},
        "696": {"rover_name":"Montana State","espn_id":"147","espn_name":"Montana State Bobcats","fox_id":"71","fox_name":"Montana State Bobcats"},
        "697": {"rover_name":"Northern Arizona","espn_id":"2464","espn_name":"Northern Arizona Lumberjacks","fox_id":"72","fox_name":"Northern Arizona Lumberjacks"},
        "701": {"rover_name":"Weber State","espn_id":"2692","espn_name":"Weber State Wildcats","fox_id":"75","fox_name":"Weber State Wildcats"},
        "702": {"rover_name":"Charlest So.","espn_id":"2127","espn_name":"Charleston Southern Buccaneers","fox_id":"76","fox_name":"Charleston Southern Buccaneers"},
        "703": {"rover_name":"Coast Carolina","espn_id":"324","espn_name":"Coastal Carolina Chanticleers","fox_id":"77","fox_name":"Coastal Carolina Chanticleers"},
        "704": {"rover_name":"Gardner-Webb","espn_id":"2241","espn_name":"Gardner-Webb Runnin' Bulldogs","fox_id":"456","fox_name":"Gardner-Webb Runnin' Bulldogs"},
        "705": {"rover_name":"High Point","espn_id":"2272","espn_name":"High Point Panthers","fox_id":"79","fox_name":"High Point Panthers"},
        "706": {"rover_name":"Liberty","espn_id":"2335","espn_name":"Liberty Flames","fox_id":"80","fox_name":"Liberty Flames"},
        "707": {"rover_name":"Presbyterian","espn_id":"2506","espn_name":"Presbyterian Blue Hose","fox_id":"402","fox_name":"Presbyterian Blue Hose"},
        "708": {"rover_name":"Radford","espn_id":"2515","espn_name":"Radford Highlanders","fox_id":"82","fox_name":"Radford Highlanders"},
        "709": {"rover_name":"UNC Asheville","espn_id":"2427","espn_name":"UNC Asheville Bulldogs","fox_id":"81","fox_name":"UNC Asheville Bulldogs"},
        "711": {"rover_name":"Winthrop","espn_id":"2737","espn_name":"Winthrop Eagles","fox_id":"83","fox_name":"Winthrop Eagles"},
        "712": {"rover_name":"Illinois","espn_id":"356","espn_name":"Illinois Fighting Illini","fox_id":"84","fox_name":"Illinois Fighting Illini"},
        "713": {"rover_name":"Indiana","espn_id":"84","espn_name":"Indiana Hoosiers","fox_id":"85","fox_name":"Indiana Hoosiers"},
        "714": {"rover_name":"Iowa","espn_id":"2294","espn_name":"Iowa Hawkeyes","fox_id":"86","fox_name":"Iowa Hawkeyes"},
        "715": {"rover_name":"Michigan","espn_id":"130","espn_name":"Michigan Wolverines","fox_id":"87","fox_name":"Michigan Wolverines"},
        "716": {"rover_name":"Michigan State","espn_id":"127","espn_name":"Michigan State Spartans","fox_id":"88","fox_name":"Michigan State Spartans"},
        "717": {"rover_name":"Minnesota","espn_id":"135","espn_name":"Minnesota Golden Gophers","fox_id":"89","fox_name":"Minnesota Golden Gophers"},
        "718": {"rover_name":"Northwestern","espn_id":"77","espn_name":"Northwestern Wildcats","fox_id":"90","fox_name":"Northwestern Wildcats"},
        "719": {"rover_name":"Ohio State","espn_id":"194","espn_name":"Ohio State Buckeyes","fox_id":"91","fox_name":"Ohio State Buckeyes"},
        "720": {"rover_name":"Penn State","espn_id":"213","espn_name":"Penn State Nittany Lions","fox_id":"92","fox_name":"Penn State Nittany Lions"},
        "721": {"rover_name":"Purdue","espn_id":"2509","espn_name":"Purdue Boilermakers","fox_id":"93","fox_name":"Purdue Boilermakers"},
        "722": {"rover_name":"Wisconsin","espn_id":"275","espn_name":"Wisconsin Badgers","fox_id":"94","fox_name":"Wisconsin Badgers"},
        "723": {"rover_name":"Baylor","espn_id":"239","espn_name":"Baylor Bears","fox_id":"41","fox_name":"Baylor Bears"},
        "724": {"rover_name":"Colorado","espn_id":"38","espn_name":"Colorado Buffaloes","fox_id":"42","fox_name":"Colorado Buffaloes"},
        "725": {"rover_name":"Iowa State","espn_id":"66","espn_name":"Iowa State Cyclones","fox_id":"43","fox_name":"Iowa State Cyclones"},
        "726": {"rover_name":"Kansas","espn_id":"2305","espn_name":"Kansas Jayhawks","fox_id":"44","fox_name":"Kansas Jayhawks"},
        "727": {"rover_name":"Kansas State","espn_id":"2306","espn_name":"Kansas State Wildcats","fox_id":"45","fox_name":"Kansas State Wildcats"},
        "728": {"rover_name":"Missouri","espn_id":"142","espn_name":"Missouri Tigers","fox_id":"46","fox_name":"Missouri Tigers"},
        "729": {"rover_name":"Nebraska","espn_id":"158","espn_name":"Nebraska Cornhuskers","fox_id":"47","fox_name":"Nebraska Cornhuskers"},
        "730": {"rover_name":"Oklahoma","espn_id":"201","espn_name":"Oklahoma Sooners","fox_id":"48","fox_name":"Oklahoma Sooners"},
        "731": {"rover_name":"Oklahoma State","espn_id":"197","espn_name":"Oklahoma State Cowboys","fox_id":"49","fox_name":"Oklahoma State Cowboys"},
        "732": {"rover_name":"Texas","espn_id":"251","espn_name":"Texas Longhorns","fox_id":"50","fox_name":"Texas Longhorns"},
        "733": {"rover_name":"Queens University","espn_id":"2511","espn_name":"Queens University Royals","fox_id":"403","fox_name":"Queens University Royals"},
        "734": {"rover_name":"Texas Tech","espn_id":"2641","espn_name":"Texas Tech Red Raiders","fox_id":"52","fox_name":"Texas Tech Red Raiders"},
        "736": {"rover_name":"Fullerton","espn_id":"2239","espn_name":"Cal State Fullerton Titans","fox_id":"97","fox_name":"Cal State Fullerton Titans"},
        "737": {"rover_name":"CS North","espn_id":"2463","espn_name":"Cal State Northridge Matadors","fox_id":"67","fox_name":"Cal State Northridge Matadors"},
        "738": {"rover_name":"Long Be St","espn_id":"299","espn_name":"Long Beach State Beach","fox_id":"99","fox_name":"Long Beach State Beach"},
        "740": {"rover_name":"UC Davis","espn_id":"302","espn_name":"UC Davis Aggies","fox_id":"341","fox_name":"UC Davis Aggies"},
        "745": {"rover_name":"Drexel","espn_id":"2182","espn_name":"Drexel Dragons","fox_id":"3","fox_name":"Drexel Dragons"},
        "746": {"rover_name":"George Mason","espn_id":"2244","espn_name":"George Mason Patriots","fox_id":"106","fox_name":"George Mason Patriots"},
        "747": {"rover_name":"Georgia State","espn_id":"2247","espn_name":"Georgia State Panthers","fox_id":"34","fox_name":"Georgia State Panthers"},
        "749": {"rover_name":"James Madison","espn_id":"256","espn_name":"James Madison Dukes","fox_id":"107","fox_name":"James Madison Dukes"},
        "751": {"rover_name":"Northeastern","espn_id":"111","espn_name":"Northeastern Huskies","fox_id":"8","fox_name":"Northeastern Huskies"},
        "752": {"rover_name":"Old Dominion","espn_id":"295","espn_name":"Old Dominion Monarchs","fox_id":"109","fox_name":"Old Dominion Monarchs"},
        "753": {"rover_name":"Towson","espn_id":"119","espn_name":"Towson Tigers","fox_id":"9","fox_name":"Towson Tigers"},
        "754": {"rover_name":"VCU","espn_id":"2670","espn_name":"VCU Rams","fox_id":"111","fox_name":"VCU Rams"},
        "756": {"rover_name":"East Carolina","espn_id":"151","espn_name":"East Carolina Pirates","fox_id":"105","fox_name":"East Carolina Pirates"},
        "757": {"rover_name":"Houston","espn_id":"248","espn_name":"Houston Cougars","fox_id":"113","fox_name":"Houston Cougars"},
        "758": {"rover_name":"Marshall","espn_id":"276","espn_name":"Marshall Thundering Herd","fox_id":"161","fox_name":"Marshall Thundering Herd"},
        "759": {"rover_name":"Memphis Tigers","espn_id":"235","espn_name":"Memphis Tigers","fox_id":"114","fox_name":"Memphis Tigers"},
        "763": {"rover_name":"Tulane","espn_id":"2655","espn_name":"Tulane Green Wave","fox_id":"117","fox_name":"Tulane Green Wave"},
        "765": {"rover_name":"UAB","espn_id":"5","espn_name":"UAB Blazers","fox_id":"118","fox_name":"UAB Blazers"},
        "766": {"rover_name":"UCF","espn_id":"2116","espn_name":"UCF Knights","fox_id":"32","fox_name":"UCF Knights"},
        "767": {"rover_name":"UTEP","espn_id":"2638","espn_name":"UTEP Miners","fox_id":"319","fox_name":"UTEP Miners"},
        "768": {"rover_name":"Chicago State","espn_id":"2130","espn_name":"Chicago State Cougars","fox_id":"282","fox_name":"Chicago State Cougars"},
        "770": {"rover_name":"NJIT Highlanders","espn_id":"2885","espn_name":"NJIT Highlanders","fox_id":"388","fox_name":"NJIT Highlanders"},
        "771": {"rover_name":"North Dakota","espn_id":"155","espn_name":"North Dakota Fighting Hawks","fox_id":"489","fox_name":"North Dakota Fighting Hawks"},
        "772": {"rover_name":"South Dakota","espn_id":"233","espn_name":"South Dakota Coyotes","fox_id":"416","fox_name":"South Dakota Coyotes"},
        "774": {"rover_name":"Texas A&M","espn_id":"245","espn_name":"Texas A&M Aggies","fox_id":"51","fox_name":"Texas A&M Aggies"},
        "775": {"rover_name":"Butler","espn_id":"2086","espn_name":"Butler Bulldogs","fox_id":"125","fox_name":"Butler Bulldogs"},
        "776": {"rover_name":"Cleveland State","espn_id":"325","espn_name":"Cleveland State Vikings","fox_id":"126","fox_name":"Cleveland State Vikings"},
        "780": {"rover_name":"Loyola Chicago","espn_id":"2350","espn_name":"Loyola Chicago Ramblers","fox_id":"129","fox_name":"Loyola Chicago Ramblers"},
        "781": {"rover_name":"Milwaukee","espn_id":"270","espn_name":"Milwaukee Panthers","fox_id":"131","fox_name":"Milwaukee Panthers"},
        "782": {"rover_name":"Valparaiso","espn_id":"2674","espn_name":"Valparaiso Beacons","fox_id":"288","fox_name":"Valparaiso Beacons"},
        "783": {"rover_name":"Wright State","espn_id":"2750","espn_name":"Wright State Raiders","fox_id":"132","fox_name":"Wright State Raiders"},
        "784": {"rover_name":"Youngst St","espn_id":"2754","espn_name":"Youngstown State Penguins","fox_id":"290","fox_name":"Youngstown State Penguins"},
        "786": {"rover_name":"Longwood","espn_id":"2344","espn_name":"Longwood Lancers","fox_id":"376","fox_name":"Longwood Lancers"},
        "787": {"rover_name":"NC Central","espn_id":"2428","espn_name":"North Carolina Central Eagles","fox_id":"393","fox_name":"North Carolina Central Eagles"},
        "788": {"rover_name":"New Orleans","espn_id":"2443","espn_name":"LSU New Orleans Privateers","fox_id":"300","fox_name":"LSU New Orleans Privateers"},
        "790": {"rover_name":"Seattle U","espn_id":"2547","espn_name":"Seattle U Redhawks","fox_id":"693","fox_name":"Seattle Redhawks"},
        "791": {"rover_name":"SIU Edwars","espn_id":"2565","espn_name":"SIU Edwardsville Cougars","fox_id":"411","fox_name":"SIU Edwardsville Cougars"},
        "793": {"rover_name":"Brown Bears","espn_id":"225","espn_name":"Brown Bears","fox_id":"139","fox_name":"Brown Bears"},
        "794": {"rover_name":"Columbia","espn_id":"171","espn_name":"Columbia Lions","fox_id":"140","fox_name":"Columbia Lions"},
        "795": {"rover_name":"Cornell","espn_id":"172","espn_name":"Cornell Big Red","fox_id":"141","fox_name":"Cornell Big Red"},
        "796": {"rover_name":"Dartmouth","espn_id":"159","espn_name":"Dartmouth Big Green","fox_id":"142","fox_name":"Dartmouth Big Green"},
        "800": {"rover_name":"Yale","espn_id":"43","espn_name":"Yale Bulldogs","fox_id":"146","fox_name":"Yale Bulldogs"},
        "801": {"rover_name":"Canisius","espn_id":"2099","espn_name":"Canisius Golden Griffins","fox_id":"147","fox_name":"Canisius Golden Griffins"},
        "803": {"rover_name":"Iona","espn_id":"314","espn_name":"Iona Gaels","fox_id":"149","fox_name":"Iona Gaels"},
        "804": {"rover_name":"Loyola Maryland","espn_id":"2352","espn_name":"Loyola Maryland Greyhounds","fox_id":"150","fox_name":"Loyola Maryland Greyhounds"},
        "805": {"rover_name":"Manhattan","espn_id":"2363","espn_name":"Manhattan Jaspers","fox_id":"151","fox_name":"Manhattan Jaspers"},
        "806": {"rover_name":"Marist","espn_id":"2368","espn_name":"Marist Red Foxes","fox_id":"152","fox_name":"Marist Red Foxes"},
        "807": {"rover_name":"Niagara","espn_id":"315","espn_name":"Niagara Purple Eagles","fox_id":"153","fox_name":"Niagara Purple Eagles"},
        "808": {"rover_name":"Rider","espn_id":"2520","espn_name":"Rider Broncs","fox_id":"154","fox_name":"Rider Broncs"},
        "809": {"rover_name":"Siena","espn_id":"2561","espn_name":"Siena Saints","fox_id":"155","fox_name":"Siena Saints"},
        "810": {"rover_name":"Saint Peters","espn_id":"2612","espn_name":"Saint Peter's Peacocks","fox_id":"156","fox_name":"Saint Peter's Peacocks"},
        "811": {"rover_name":"Akron","espn_id":"2006","espn_name":"Akron Zips","fox_id":"157","fox_name":"Akron Zips"},
        "812": {"rover_name":"Bowling Green","espn_id":"189","espn_name":"Bowling Green Falcons","fox_id":"158","fox_name":"Bowling Green Falcons"},
        "813": {"rover_name":"Buffalo","espn_id":"2084","espn_name":"Buffalo Bulls","fox_id":"159","fox_name":"Buffalo Bulls"},
        "814": {"rover_name":"Kent State","espn_id":"2309","espn_name":"Kent State Golden Flashes","fox_id":"160","fox_name":"Kent State Golden Flashes"},
        "815": {"rover_name":"Miami (OH)","espn_id":"193","espn_name":"Miami (OH) RedHawks","fox_id":"162","fox_name":"Miami (OH) RedHawks"},
        "816": {"rover_name":"Ohio","espn_id":"195","espn_name":"Ohio Bobcats","fox_id":"163","fox_name":"Ohio Bobcats"},
        "817": {"rover_name":"Ball State","espn_id":"2050","espn_name":"Ball State Cardinals","fox_id":"164","fox_name":"Ball State Cardinals"},
        "818": {"rover_name":"Central Michigan","espn_id":"2117","espn_name":"Central Michigan Chippewas","fox_id":"165","fox_name":"Central Michigan Chippewas"},
        "819": {"rover_name":"Eastern Michigan","espn_id":"2199","espn_name":"Eastern Michigan Eagles","fox_id":"166","fox_name":"Eastern Michigan Eagles"},
        "820": {"rover_name":"Northern Illinois","espn_id":"2459","espn_name":"Northern Illinois Huskies","fox_id":"167","fox_name":"Northern Illinois Huskies"},
        "821": {"rover_name":"Toledo","espn_id":"2649","espn_name":"Toledo Rockets","fox_id":"168","fox_name":"Toledo Rockets"},
        "822": {"rover_name":"Western Michigan","espn_id":"2711","espn_name":"Western Michigan Broncos","fox_id":"169","fox_name":"Western Michigan Broncos"},
        "823": {"rover_name":"Bethune","espn_id":"2065","espn_name":"Bethune-Cookman Wildcats","fox_id":"170","fox_name":"Bethune-Cookman Wildcats"},
        "824": {"rover_name":"Coppin State","espn_id":"2154","espn_name":"Coppin State Eagles","fox_id":"171","fox_name":"Coppin State Eagles"},
        "826": {"rover_name":"Florida A&M","espn_id":"50","espn_name":"Florida A&M Rattlers","fox_id":"173","fox_name":"Florida A&M Rattlers"},
        "827": {"rover_name":"Hampton","espn_id":"2261","espn_name":"Hampton Pirates","fox_id":"174","fox_name":"Hampton Pirates"},
        "828": {"rover_name":"Howard","espn_id":"47","espn_name":"Howard Bison","fox_id":"175","fox_name":"Howard Bison"},
        "829": {"rover_name":"Maryland Eastern Shore","espn_id":"2379","espn_name":"Maryland Eastern Shore Hawks","fox_id":"176","fox_name":"Maryland-Eastern Shore Hawks"},
        "835": {"rover_name":"Creighton","espn_id":"156","espn_name":"Creighton Bluejays","fox_id":"182","fox_name":"Creighton Bluejays"},
        "838": {"rover_name":"Illinois State","espn_id":"2287","espn_name":"Illinois State Redbirds","fox_id":"185","fox_name":"Illinois State Redbirds"},
        "839": {"rover_name":"Indiana St","espn_id":"282","espn_name":"Indiana State Sycamores","fox_id":"186","fox_name":"Indiana State Sycamores"},
        "843": {"rover_name":"Wichita State","espn_id":"2724","espn_name":"Wichita State Shockers","fox_id":"190","fox_name":"Wichita State Shockers"},
        "844": {"rover_name":"Air Force","espn_id":"2005","espn_name":"Air Force Falcons","fox_id":"191","fox_name":"Air Force Falcons"},
        "845": {"rover_name":"BYU","espn_id":"252","espn_name":"BYU Cougars","fox_id":"192","fox_name":"BYU Cougars"},
        "846": {"rover_name":"Colorado State","espn_id":"36","espn_name":"Colorado State Rams","fox_id":"193","fox_name":"Colorado State Rams"},
        "847": {"rover_name":"New Mexico","espn_id":"167","espn_name":"New Mexico Lobos","fox_id":"194","fox_name":"New Mexico Lobos"},
        "848": {"rover_name":"S. Diego St.","espn_id":"21","espn_name":"San Diego State Aztecs","fox_id":"195","fox_name":"San Diego State Aztecs"},
        "849": {"rover_name":"TCU","espn_id":"2628","espn_name":"TCU Horned Frogs","fox_id":"317","fox_name":"TCU Horned Frogs"},
        "850": {"rover_name":"UNLV","espn_id":"2439","espn_name":"UNLV Rebels","fox_id":"196","fox_name":"UNLV Runnin' Rebels"},
        "851": {"rover_name":"Utah","espn_id":"254","espn_name":"Utah Utes","fox_id":"197","fox_name":"Utah Runnin' Utes"},
        "853": {"rover_name":"Bryant","espn_id":"2803","espn_name":"Bryant Bulldogs","fox_id":"820","fox_name":"Bryant Bulldogs"},
        "854": {"rover_name":"Central Connecticut","espn_id":"2115","espn_name":"Central Connecticut Blue Devils","fox_id":"199","fox_name":"Central Connecticut State Blue Devils"},
        "855": {"rover_name":"Fair Dick","espn_id":"161","espn_name":"Fairleigh Dickinson Knights","fox_id":"200","fox_name":"FDU Knights"},
        "856": {"rover_name":"LIU Brooklyn","espn_id":"112358","espn_name":"Long Island University Sharks","fox_id":"1468","fox_name":"LIU Sharks"},
        "857": {"rover_name":"Monmouth","espn_id":"2405","espn_name":"Monmouth Hawks","fox_id":"203","fox_name":"Monmouth Hawks"},
        "858": {"rover_name":"Mount St. Marys","espn_id":"116","espn_name":"Mount St. Mary's Mountaineers","fox_id":"204","fox_name":"Mount St. Mary's Mountaineers"},
        "859": {"rover_name":"Quinnipiac","espn_id":"2514","espn_name":"Quinnipiac Bobcats","fox_id":"205","fox_name":"Quinnipiac Bobcats"},
        "860": {"rover_name":"Robert Morris","espn_id":"2523","espn_name":"Robert Morris Colonials","fox_id":"206","fox_name":"Robert Morris Colonials"},
        "864": {"rover_name":"Wagner","espn_id":"2681","espn_name":"Wagner Seahawks","fox_id":"210","fox_name":"Wagner Seahawks"},
        "866": {"rover_name":"Eastern Illinois","espn_id":"2197","espn_name":"Eastern Illinois Panthers","fox_id":"212","fox_name":"Eastern Illinois Panthers"},
        "869": {"rover_name":"Morehead State","espn_id":"2413","espn_name":"Morehead State Eagles","fox_id":"214","fox_name":"Morehead State Eagles"},
        "870": {"rover_name":"Murray State","espn_id":"93","espn_name":"Murray State Racers","fox_id":"215","fox_name":"Murray State Racers"},
        "872": {"rover_name":"Tennessee State","espn_id":"2634","espn_name":"Tennessee State Tigers","fox_id":"217","fox_name":"Tennessee State Tigers"},
        "873": {"rover_name":"Tennessee Tech","espn_id":"2635","espn_name":"Tennessee Tech Golden Eagles","fox_id":"218","fox_name":"Tennessee Tech Golden Eagles"},
        "874": {"rover_name":"UT Martin","espn_id":"2630","espn_name":"UT Martin Skyhawks","fox_id":"219","fox_name":"Tennessee-Martin Skyhawks"},
        "875": {"rover_name":"Arizona","espn_id":"12","espn_name":"Arizona Wildcats","fox_id":"220","fox_name":"Arizona Wildcats"},
        "876": {"rover_name":"Arizona St","espn_id":"9","espn_name":"Arizona State Sun Devils","fox_id":"221","fox_name":"Arizona State Sun Devils"},
        "877": {"rover_name":"California","espn_id":"25","espn_name":"California Golden Bears","fox_id":"222","fox_name":"California Golden Bears"},
        "878": {"rover_name":"Oregon","espn_id":"2483","espn_name":"Oregon Ducks","fox_id":"223","fox_name":"Oregon Ducks"},
        "879": {"rover_name":"Oregon State","espn_id":"204","espn_name":"Oregon State Beavers","fox_id":"224","fox_name":"Oregon State Beavers"},
        "880": {"rover_name":"Stanford","espn_id":"24","espn_name":"Stanford Cardinal","fox_id":"226","fox_name":"Stanford Cardinal"},
        "881": {"rover_name":"UCLA","espn_id":"26","espn_name":"UCLA Bruins","fox_id":"227","fox_name":"UCLA Bruins"},
        "882": {"rover_name":"USC","espn_id":"30","espn_name":"USC Trojans","fox_id":"225","fox_name":"USC Trojans"},
        "883": {"rover_name":"Washington","espn_id":"264","espn_name":"Washington Huskies","fox_id":"228","fox_name":"Washington Huskies"},
        "884": {"rover_name":"Washington State","espn_id":"265","espn_name":"Washington State Cougars","fox_id":"229","fox_name":"Washington State Cougars"},
        "885": {"rover_name":"American University","espn_id":"44","espn_name":"American University Eagles","fox_id":"104","fox_name":"American Eagles"},
        "886": {"rover_name":"Army","espn_id":"349","espn_name":"Army Black Knights","fox_id":"230","fox_name":"Army Black Knights"},
        "887": {"rover_name":"Bucknell","espn_id":"2083","espn_name":"Bucknell Bison","fox_id":"231","fox_name":"Bucknell Bison"},
        "888": {"rover_name":"Colgate","espn_id":"2142","espn_name":"Colgate Raiders","fox_id":"232","fox_name":"Colgate Raiders"},
        "889": {"rover_name":"Holy Cross","espn_id":"107","espn_name":"Holy Cross Crusaders","fox_id":"233","fox_name":"Holy Cross Crusaders"},
        "890": {"rover_name":"Grand Canyon","espn_id":"2253","espn_name":"Grand Canyon Lopes","fox_id":"362","fox_name":"Grand Canyon Lopes"},
        "891": {"rover_name":"Lehigh","espn_id":"2329","espn_name":"Lehigh Mountain Hawks","fox_id":"235","fox_name":"Lehigh Mountain Hawks"},
        "892": {"rover_name":"Navy","espn_id":"2426","espn_name":"Navy Midshipmen","fox_id":"236","fox_name":"Navy Midshipmen"},
        "893": {"rover_name":"Florida","espn_id":"57","espn_name":"Florida Gators","fox_id":"237","fox_name":"Florida Gators"},
        "894": {"rover_name":"Georgia","espn_id":"61","espn_name":"Georgia Bulldogs","fox_id":"238","fox_name":"Georgia Bulldogs"},
        "895": {"rover_name":"Kentucky","espn_id":"96","espn_name":"Kentucky Wildcats","fox_id":"239","fox_name":"Kentucky Wildcats"},
        "897": {"rover_name":"Tennessee","espn_id":"2633","espn_name":"Tennessee Volunteers","fox_id":"241","fox_name":"Tennessee Volunteers"},
        "898": {"rover_name":"Vanderbilt","espn_id":"238","espn_name":"Vanderbilt Commodores","fox_id":"242","fox_name":"Vanderbilt Commodores"},
        "899": {"rover_name":"Alabama","espn_id":"333","espn_name":"Alabama Crimson Tide","fox_id":"243","fox_name":"Alabama Crimson Tide"},
        "900": {"rover_name":"Arkansas","espn_id":"8","espn_name":"Arkansas Razorbacks","fox_id":"244","fox_name":"Arkansas Razorbacks"},
        "901": {"rover_name":"Auburn","espn_id":"2","espn_name":"Auburn Tigers","fox_id":"245","fox_name":"Auburn Tigers"},
        "902": {"rover_name":"LSU","espn_id":"99","espn_name":"LSU Tigers","fox_id":"246","fox_name":"LSU Tigers"},
        "903": {"rover_name":"Ole Miss","espn_id":"145","espn_name":"Ole Miss Rebels","fox_id":"247","fox_name":"Ole Miss Rebels"},
        "904": {"rover_name":"Mississippi State","espn_id":"344","espn_name":"Mississippi State Bulldogs","fox_id":"248","fox_name":"Mississippi State Bulldogs"},
        "906": {"rover_name":"Appalachian State","espn_id":"2026","espn_name":"App State Mountaineers","fox_id":"255","fox_name":"Appalachian State Mountaineers"},
        "907": {"rover_name":"Chattanooga","espn_id":"236","espn_name":"Chattanooga Mocs","fox_id":"250","fox_name":"Chattanooga Mocs"},
        "908": {"rover_name":"Elon Phoenix","espn_id":"2210","espn_name":"Elon Phoenix","fox_id":"78","fox_name":"Elon Phoenix"},
        "910": {"rover_name":"Western Carolina","espn_id":"2717","espn_name":"Western Carolina Catamounts","fox_id":"260","fox_name":"Western Carolina Catamounts"},
        "911": {"rover_name":"The Citadel","espn_id":"2643","espn_name":"The Citadel Bulldogs","fox_id":"251","fox_name":"The Citadel Bulldogs"},
        "913": {"rover_name":"Davidson","espn_id":"2166","espn_name":"Davidson Wildcats","fox_id":"256","fox_name":"Davidson Wildcats"},
        "914": {"rover_name":"Furman","espn_id":"231","espn_name":"Furman Paladins","fox_id":"252","fox_name":"Furman Paladins"},
        "915": {"rover_name":"Georgia Southern","espn_id":"290","espn_name":"Georgia Southern Eagles","fox_id":"253","fox_name":"Georgia Southern Eagles"},
        "916": {"rover_name":"Wofford","espn_id":"2747","espn_name":"Wofford Terriers","fox_id":"254","fox_name":"Wofford Terriers"},
        "917": {"rover_name":"Central Arkansas","espn_id":"2110","espn_name":"Central Arkansas Bears","fox_id":"465","fox_name":"Central Arkansas Bears"},
        "919": {"rover_name":"McNeese State","espn_id":"2377","espn_name":"McNeese Cowboys","fox_id":"263","fox_name":"McNeese Cowboys"},
        "921": {"rover_name":"Northwestern State","espn_id":"2466","espn_name":"Northwestern State Demons","fox_id":"265","fox_name":"Northwestern State Demons"},
        "922": {"rover_name":"Southeastern Louisia","espn_id":"2545","espn_name":"SE Louisiana Lions","fox_id":"267","fox_name":"Southeastern Louisiana Lions"},
        "923": {"rover_name":"Sam Houston State","espn_id":"2534","espn_name":"Sam Houston Bearkats","fox_id":"266","fox_name":"Sam Houston Bearkats"},
        "925": {"rover_name":"Texas Corpus","espn_id":"357","espn_name":"Texas A&M-Corpus Christi Islanders","fox_id":"137","fox_name":"Texas A&M-Corpus Christi Islanders"},
        "926": {"rover_name":"Texas State","espn_id":"326","espn_name":"Texas State Bobcats","fox_id":"268","fox_name":"Texas State Bobcats"},
        "928": {"rover_name":"UTSA Roadrunners","espn_id":"2636","espn_name":"UTSA Roadrunners","fox_id":"271","fox_name":"UTSA Roadrunners"},
        "930": {"rover_name":"Purdue Fort Wayne","espn_id":"2870","espn_name":"Purdue Fort Wayne Mastodons","fox_id":"463","fox_name":"Purdue Fort Wayne Mastodons"},
        "932": {"rover_name":"ND State","espn_id":"2449","espn_name":"North Dakota State Bison","fox_id":"490","fox_name":"North Dakota State Bison"},
        "933": {"rover_name":"Oakland","espn_id":"2473","espn_name":"Oakland Golden Grizzlies","fox_id":"285","fox_name":"Oakland Golden Grizzlies"},
        "934": {"rover_name":"Oral Roberts","espn_id":"198","espn_name":"Oral Roberts Golden Eagles","fox_id":"286","fox_name":"Oral Roberts Golden Eagles"},
        "935": {"rover_name":"South Dakota State","espn_id":"2571","espn_name":"South Dakota State Jackrabbits","fox_id":"417","fox_name":"South Dakota State Jackrabbits"},
        "937": {"rover_name":"Kansas City","espn_id":"140","espn_name":"Kansas City Roos","fox_id":"284","fox_name":"Kansas City Roos"},
        "938": {"rover_name":"Western Illinois","espn_id":"2710","espn_name":"Western Illinois Leathernecks","fox_id":"289","fox_name":"Western Illinois Leathernecks"},
        "940": {"rover_name":"Alabama State","espn_id":"2011","espn_name":"Alabama State Hornets","fox_id":"323","fox_name":"Alabama State Hornets"},
        "941": {"rover_name":"Alcorn State","espn_id":"2016","espn_name":"Alcorn State Braves","fox_id":"274","fox_name":"Alcorn State Braves"},
        "942": {"rover_name":"Arkansas Pine Bluff","espn_id":"2029","espn_name":"Arkansas-Pine Bluff Golden Lions","fox_id":"275","fox_name":"Arkansas-Pine Bluff Golden Lions"},
        "943": {"rover_name":"Grambling","espn_id":"2755","espn_name":"Grambling Tigers","fox_id":"276","fox_name":"Grambling State Tigers"},
        "944": {"rover_name":"Jackson State","espn_id":"2296","espn_name":"Jackson State Tigers","fox_id":"277","fox_name":"Jackson State Tigers"},
        "947": {"rover_name":"Southern","espn_id":"2582","espn_name":"Southern Jaguars","fox_id":"280","fox_name":"Southern University Jaguars"},
        "948": {"rover_name":"Texas Southern","espn_id":"2640","espn_name":"Texas Southern Tigers","fox_id":"281","fox_name":"Texas Southern Tigers"},
        "949": {"rover_name":"Western Kentucky","espn_id":"98","espn_name":"Western Kentucky Hilltoppers","fox_id":"296","fox_name":"Western Kentucky Hilltoppers"},
        "951": {"rover_name":"Florida Atlantic","espn_id":"2226","espn_name":"Florida Atlantic Owls","fox_id":"33","fox_name":"Florida Atlantic Owls"},
        "953": {"rover_name":"South Alabama","espn_id":"6","espn_name":"South Alabama Jaguars","fox_id":"302","fox_name":"South Alabama Jaguars"},
        "954": {"rover_name":"Troy","espn_id":"2653","espn_name":"Troy Trojans","fox_id":"40","fox_name":"Troy Trojans"},
        "955": {"rover_name":"Little Rock","espn_id":"2031","espn_name":"Little Rock Trojans","fox_id":"292","fox_name":"Little Rock Trojans"},
        "956": {"rover_name":"Arkansas State","espn_id":"2032","espn_name":"Arkansas State Red Wolves","fox_id":"291","fox_name":"Arkansas State Red Wolves"},
        "957": {"rover_name":"Denver","espn_id":"2172","espn_name":"Denver Pioneers","fox_id":"297","fox_name":"Denver Pioneers"},
        "959": {"rover_name":"Louisiana","espn_id":"309","espn_name":"Louisiana Ragin' Cajuns","fox_id":"298","fox_name":"Louisiana Ragin' Cajuns"},
        "960": {"rover_name":"UL Monroe","espn_id":"2433","espn_name":"UL Monroe Warhawks","fox_id":"262","fox_name":"Louisiana-Monroe Warhawks"},
        "961": {"rover_name":"Gonzaga","espn_id":"2250","espn_name":"Gonzaga Bulldogs","fox_id":"303","fox_name":"Gonzaga Bulldogs"},
        "962": {"rover_name":"Loyola Marymount","espn_id":"2351","espn_name":"Loyola Marymount Lions","fox_id":"304","fox_name":"Loyola Marymount Lions"},
        "963": {"rover_name":"Pepperdine","espn_id":"2492","espn_name":"Pepperdine Waves","fox_id":"305","fox_name":"Pepperdine Waves"},
        "966": {"rover_name":"San Francisco","espn_id":"2539","espn_name":"San Francisco Dons","fox_id":"309","fox_name":"San Francisco Dons"},
        "967": {"rover_name":"Santa Clara","espn_id":"2541","espn_name":"Santa Clara Broncos","fox_id":"310","fox_name":"Santa Clara Broncos"},
        "971": {"rover_name":"Hawaii","espn_id":"62","espn_name":"Hawai'i Rainbow Warriors","fox_id":"312","fox_name":"Hawai'i Rainbow Warriors"},
        "973": {"rover_name":"Louisiana Tech","espn_id":"2348","espn_name":"Louisiana Tech Bulldogs","fox_id":"294","fox_name":"Louisiana Tech Bulldogs"},
        "974": {"rover_name":"Nevada","espn_id":"2440","espn_name":"Nevada Wolf Pack","fox_id":"313","fox_name":"Nevada Wolf Pack"},
        "976": {"rover_name":"San Jose","espn_id":"23","espn_name":"San José State Spartans","fox_id":"315","fox_name":"San Jose State Spartans"},
        "977": {"rover_name":"Utah State","espn_id":"328","espn_name":"Utah State Aggies","fox_id":"103","fox_name":"Utah State Aggies"},
        "980": {"rover_name":"Northern Kentucky","espn_id":"94","espn_name":"Northern Kentucky Norse","fox_id":"981","fox_name":"Northern Kentucky Norse"},
        "981": {"rover_name":"Lafayette","espn_id":"322","espn_name":"Lafayette Leopards","fox_id":"234","fox_name":"Lafayette Leopards"},
        "984": {"rover_name":"California Baptist","espn_id":"2856","espn_name":"California Baptist Lancers","fox_id":"648","fox_name":"California Baptist Lancers"},
        "985": {"rover_name":"Incarnate Word","espn_id":"2916","espn_name":"Incarnate Word Cardinals","fox_id":"962","fox_name":"Incarnate Word Cardinals"},
        "987": {"rover_name":"North Alabama","espn_id":"2453","espn_name":"North Alabama Lions","fox_id":"828","fox_name":"North Alabama Lions"},
        "988": {"rover_name":"Abilene Christian","espn_id":"2000","espn_name":"Abilene Christian Wildcats","fox_id":"320","fox_name":"Abilene Christian Wildcats"},
        "996": {"rover_name":"South Carolina","espn_id":"2579","espn_name":"South Carolina Gamecocks","fox_id":"240","fox_name":"South Carolina Gamecocks"},
        "997": {"rover_name":"Temple","espn_id":"218","espn_name":"Temple Owls","fox_id":"19","fox_name":"Temple Owls"},
        "998": {"rover_name":"SMU","espn_id":"2567","espn_name":"SMU Mustangs","fox_id":"316","fox_name":"SMU Mustangs"},
        "999": {"rover_name":"Merrimack","espn_id":"2771","espn_name":"Merrimack Warriors","fox_id":"972","fox_name":"Merrimack Warriors"}
    };

    const clean = value =>
        String(value ?? "")
            .replace(/\s+/g, " ")
            .trim();

    const upper = value =>
        clean(value).toUpperCase();

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));

    function expose(name, value) {
        try {
            window[name] = value;
        } catch (_) {}

        try {
            if (typeof unsafeWindow !== "undefined") {
                unsafeWindow[name] = value;
            }
        } catch (_) {}
    }

    // ============================================================
    // VIEW ADAPTER - CLASSIC / RESULTADOS V2
    // ============================================================

    const ROVER_VIEW = Object.freeze({
        CLASSIC: "CLASSIC",
        RV2: "RV2",
        UNKNOWN: "UNKNOWN"
    });

    function getRoverViewKind() {
        if (
            document.querySelector("#rv2_editor") &&
            document.querySelector("#rv2_listContainer")
        ) {
            return ROVER_VIEW.RV2;
        }

        if (
            document.querySelector("#resEditContainer") ||
            document.querySelector("#tablaEventos")
        ) {
            return ROVER_VIEW.CLASSIC;
        }

        return ROVER_VIEW.UNKNOWN;
    }

    function getPageWindow() {
        try {
            if (typeof unsafeWindow !== "undefined" && unsafeWindow) {
                return unsafeWindow;
            }
        } catch (_) {}

        return window;
    }

    function getEventListRoot() {
        if (getRoverViewKind() === ROVER_VIEW.RV2) {
            return document.querySelector("#rv2_listContainer");
        }

        return document.querySelector("#tablaEventos");
    }

    function getEditorContainer() {
        if (getRoverViewKind() === ROVER_VIEW.RV2) {
            return document.querySelector("#rv2_editor");
        }

        return document.querySelector("#resEditContainer");
    }

    function getEventRows() {
        const root = getEventListRoot();
        if (!root) return [];

        const selector =
            getRoverViewKind() === ROVER_VIEW.RV2
                ? "tr.rv2-event-row"
                : "tr[tkt]";

        return [...root.querySelectorAll(selector)];
    }

    function normalizeRoverTeamKey(value) {
        return upper(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/&/g, " AND ")
            .replace(/[^A-Z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    const TEAM_NAME_INDEX = (() => {
        const map = new Map();

        for (const [roverCode, item] of Object.entries(TEAM_MAP)) {
            const key = normalizeRoverTeamKey(item?.rover_name);
            if (!key) continue;

            if (!map.has(key)) map.set(key, []);

            map.get(key).push({
                roverCode: String(roverCode),
                roverName: clean(item?.rover_name)
            });
        }

        return map;
    })();

    function findRoverTeamByName(name) {
        const matches =
            TEAM_NAME_INDEX.get(normalizeRoverTeamKey(name)) || [];

        // RV2: exact normalized name and unique code only. Never fuzzy.
        return matches.length === 1 ? { ...matches[0] } : null;
    }

    function parseEventIdFromRow(row) {
        if (!row) return "";

        const direct = clean(
            row.getAttribute("tkt") ||
            row.dataset?.evento ||
            row.dataset?.eventId ||
            row.getAttribute("data-evento") ||
            row.getAttribute("data-event-id") ||
            ""
        ).replace(/\D/g, "");

        if (direct) return direct;

        const domId = clean(row.id).match(/^rv2-row-(\d+)$/)?.[1] || "";
        if (domId) return domId;

        const onclick = row.getAttribute("onclick") || "";
        const handlerId = onclick.match(
            /(?:ticketSelected|rv2_seleccionarEvento)\s*\(\s*['"]?(\d+)/
        )?.[1] || "";

        if (handlerId) return handlerId;

        return clean(row.querySelector("td")?.innerText).replace(/\D/g, "");
    }

    function getRv2WindowEventId() {
        if (getRoverViewKind() !== ROVER_VIEW.RV2) {
            return "";
        }

        try {
            const id = clean(
                getPageWindow()?._rv2_currentEvento
            );

            return /^\d+$/.test(id)
                ? id
                : "";
        } catch (_) {
            return "";
        }
    }

    function getRv2SelectedRowEventId() {
        if (getRoverViewKind() !== ROVER_VIEW.RV2) {
            return "";
        }

        const selectedRow =
            document.querySelector(
                "#rv2_listContainer .rv2-event-row.rv2-selected"
            );

        return parseEventIdFromRow(
            selectedRow
        );
    }

    function getRv2EditorHiddenEventId() {
        if (getRoverViewKind() !== ROVER_VIEW.RV2) {
            return "";
        }

        const container =
            getEditorContainer();

        if (!container) {
            return "";
        }

        const id = clean(
            container.querySelector(
                'input[name="evento[]"]'
            )?.value
        );

        return /^\d+$/.test(id)
            ? id
            : "";
    }

    function getRv2SelectedEventId() {
        const windowEventId =
            getRv2WindowEventId();

        const selectedRowEventId =
            getRv2SelectedRowEventId();

        /*
         * Before the editor arrives, RV2 already updates both the page
         * variable and the selected-row class. They must agree.
         */
        if (
            windowEventId &&
            selectedRowEventId &&
            windowEventId !==
                selectedRowEventId
        ) {
            return "";
        }

        return (
            windowEventId ||
            selectedRowEventId ||
            ""
        );
    }

    function editorHasEventEvidence(
        container,
        eventId
    ) {
        if (!container || !eventId) {
            return false;
        }

        const id = String(eventId);

        if (
            container.querySelector(
                `#${CSS.escape(
                    id + "-Estado"
                )}`
            ) ||
            container.querySelector(
                `#${CSS.escape(
                    id + "-Edited"
                )}`
            )
        ) {
            return true;
        }

        if (
            clean(
                container.innerText
            ).includes(`#${id}`)
        ) {
            return true;
        }

        return [
            ...container.querySelectorAll(
                "[id]"
            )
        ].some(element =>
            String(
                element.id || ""
            ).startsWith(id)
        );
    }

    function getRv2IdentityState({
        requireEditor = true
    } = {}) {
        if (getRoverViewKind() !== ROVER_VIEW.RV2) {
            return {
                ok: false,
                reason: "NOT_RV2",
                eventId: ""
            };
        }

        const container =
            getEditorContainer();

        const windowEventId =
            getRv2WindowEventId();

        const selectedRowEventId =
            getRv2SelectedRowEventId();

        const editorEventId =
            getRv2EditorHiddenEventId();

        const loading = Boolean(
            container &&
            (
                /Cargando evento/i.test(
                    clean(
                        container.innerText
                    )
                ) ||
                container.querySelector(
                    ".rv2-empty-state"
                )
            )
        );

        if (!windowEventId) {
            return {
                ok: false,
                reason:
                    "RV2_WINDOW_EVENT_MISSING",
                eventId: "",
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        if (!selectedRowEventId) {
            return {
                ok: false,
                reason:
                    "RV2_SELECTED_ROW_MISSING",
                eventId: "",
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        if (
            windowEventId !==
            selectedRowEventId
        ) {
            return {
                ok: false,
                reason:
                    "RV2_SELECTION_MISMATCH",
                eventId: "",
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        if (!requireEditor) {
            return {
                ok: true,
                reason:
                    "RV2_SELECTION_CONFIRMED",
                eventId:
                    windowEventId,
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        if (loading) {
            return {
                ok: false,
                reason:
                    "RV2_EDITOR_LOADING",
                eventId: "",
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        if (!editorEventId) {
            return {
                ok: false,
                reason:
                    "RV2_EDITOR_EVENT_MISSING",
                eventId: "",
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        if (
            editorEventId !==
                windowEventId ||
            editorEventId !==
                selectedRowEventId
        ) {
            return {
                ok: false,
                reason:
                    "RV2_EDITOR_STALE",
                eventId: "",
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        if (
            !editorHasEventEvidence(
                container,
                editorEventId
            )
        ) {
            return {
                ok: false,
                reason:
                    "RV2_EDITOR_UNCONFIRMED",
                eventId: "",
                windowEventId,
                selectedRowEventId,
                editorEventId,
                loading
            };
        }

        return {
            ok: true,
            reason:
                "RV2_IDENTITY_CONFIRMED",
            eventId:
                editorEventId,
            windowEventId,
            selectedRowEventId,
            editorEventId,
            loading
        };
    }

    function getEditorEventId({
        requireReady = true
    } = {}) {
        const container =
            getEditorContainer();

        if (!container) {
            return "";
        }

        if (
            getRoverViewKind() ===
            ROVER_VIEW.CLASSIC
        ) {
            return clean(
                container.querySelector(
                    'input[name="evento[]"]'
                )?.value
            );
        }

        const state =
            getRv2IdentityState({
                requireEditor:
                    requireReady
            });

        return state.ok
            ? state.eventId
            : "";
    }


    function findEventRow(eventId) {
        const id = String(eventId || "").trim();
        if (!id) return null;

        const root = getEventListRoot();
        if (!root) return null;

        if (getRoverViewKind() === ROVER_VIEW.RV2) {
            const direct = root.querySelector(
                `#${CSS.escape("rv2-row-" + id)}`
            );
            if (direct) return direct;
        } else {
            const direct = root.querySelector(
                `tr[tkt="${CSS.escape(id)}"]`
            );
            if (direct) return direct;
        }

        return getEventRows().find(
            row => parseEventIdFromRow(row) === id
        ) || null;
    }

    // ============================================================
    // MOD 02 - GUARD: SOLO CATEGORY BASKETBALL + LEAGUE CBB
    // ============================================================

    function findSelectByLabel(labelText) {
        const wanted = upper(labelText);

        if (getRoverViewKind() === ROVER_VIEW.RV2) {
            if (wanted === "CATEGORY") {
                return document.querySelector("#rv2_categoria");
            }

            if (wanted === "LEAGUE") {
                return document.querySelector("#rv2_ligaC select");
            }
        }

        /*
         * IDs/estructura primero. IMPORTANTE: nunca identificar LEAGUE por
         * la opción actualmente seleccionada. Si hacemos eso, al pasar de
         * CBB -> CFL dejamos de reconocer el control y no marcamos dirty.
         */
        if (wanted === "CATEGORY") {
            const category = document.querySelector(
                'select#categoria, select[name="categoria"], select[name="category"]'
            );
            if (category) {
                return category;
            }
        }

        const markers = document.querySelectorAll(
            'label, h1, h2, h3, h4, h5, h6, .box-title'
        );

        for (const marker of markers) {
            if (!upper(marker.textContent).includes(wanted)) {
                continue;
            }

            const forId = marker.getAttribute?.("for");

            if (forId) {
                const target = document.getElementById(forId);
                if (target?.tagName === "SELECT") {
                    return target;
                }
            }

            const containers = [
                marker.parentElement,
                marker.closest?.(".example"),
                marker.closest?.(".form-group"),
                marker.closest?.("[class*='col-']")
            ].filter(Boolean);

            for (const container of containers) {
                const local = container.querySelector?.("select");
                if (local) {
                    return local;
                }
            }
        }

        const selects = [...document.querySelectorAll("select")];

        if (wanted === "CATEGORY") {
            return selects.find(select =>
                [...select.options].some(option =>
                    upper(option.textContent) === "BASKETBALL"
                )
            ) || null;
        }

        if (wanted === "LEAGUE") {
            /*
             * El selector de liga contiene opciones como CBB/NBA. Buscar en
             * TODAS sus opciones funciona aunque la seleccionada sea otra.
             */
            return selects.find(select => {
                const optionTexts = [...select.options].map(option =>
                    upper(option.textContent)
                );

                return (
                    optionTexts.includes("CBB") ||
                    optionTexts.includes("NBA")
                );
            }) || null;
        }

        return null;
    }

    const cachedContextElements = {
        category: null,
        league: null,
        date: null
    };

    function contextElementMatchesView(key, element) {
        if (!element) return false;

        const view = getRoverViewKind();

        if (view === ROVER_VIEW.RV2) {
            if (key === "category") return element.id === "rv2_categoria";
            if (key === "league") return Boolean(element.closest?.("#rv2_ligaC"));
            if (key === "date") return element.id === "rv2_fecha";
        }

        if (view === ROVER_VIEW.CLASSIC) {
            return (
                element.id !== "rv2_categoria" &&
                element.id !== "rv2_fecha" &&
                !element.closest?.("#rv2_ligaC")
            );
        }

        return false;
    }

    function getCachedContextElement(key, resolver) {
        const current = cachedContextElements[key];

        if (
            current?.isConnected &&
            contextElementMatchesView(key, current)
        ) {
            return current;
        }

        const next = resolver() || null;
        cachedContextElements[key] = next;
        return next;
    }


    function getContextSelect(kind) {
        if (kind === "CATEGORY") {
            return getCachedContextElement(
                "category",
                () => findSelectByLabel("CATEGORY")
            );
        }

        if (kind === "LEAGUE") {
            return getCachedContextElement(
                "league",
                () => findSelectByLabel("LEAGUE")
            );
        }

        return null;
    }

    function getDateInput() {
        return getCachedContextElement("date", () => {
            if (getRoverViewKind() === ROVER_VIEW.RV2) {
                return document.querySelector("#rv2_fecha");
            }

            const inputs = [
                ...document.querySelectorAll(
                    'input[name="fecha"], input#fecha'
                )
            ];

            return inputs.find(input =>
                /^\d{4}-\d{2}-\d{2}$/.test(clean(input.value))
            ) || inputs[0] || null;
        });
    }


    function getSelected(select) {
        if (!select) {
            return { value: "", text: "" };
        }

        const option = select.options[select.selectedIndex];

        return {
            value: upper(select.value),
            text: upper(option?.textContent)
        };
    }

    function getContext() {
        const category = getSelected(getContextSelect("CATEGORY"));
        const league = getSelected(getContextSelect("LEAGUE"));

        return {
            view: getRoverViewKind(),
            category,
            league,
            tableExists: Boolean(getEventListRoot()),
            editorExists: Boolean(getEditorContainer())
        };
    }


    function isCBBView() {
        const ctx = getContext();

        const categoryOK =
            ctx.category.value === "BASKETBALL" ||
            ctx.category.text === "BASKETBALL";

        const leagueOK =
            ctx.league.value === "CBB" ||
            ctx.league.text === "CBB";

        return categoryOK && leagueOK && ctx.tableExists;
    }

    function requireCBBView() {
        if (!isCBBView()) {
            console.error(`${TAG} ⛔ Inactivo: solo funciona en CATEGORY=BASKETBALL y LEAGUE=CBB.`);
            return false;
        }

        if (contextGate.dirty) {
            console.warn(
                `${TAG} ⏳ Filtros cambiados. Pulsa Search antes de procesar CBB.`
            );
            return false;
        }

        return true;
    }

    // ============================================================
    // MOD 03 - FECHA ROVER
    // ============================================================

    function normalizeRoverFilterDate(value, { monthFirst = false } = {}) {
        const raw = clean(value);

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

        const match = raw.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
        );

        if (!match) return "";

        const first = Number(match[1]);
        const second = Number(match[2]);
        const year = Number(match[3]);
        const month = monthFirst ? first : second;
        const day = monthFirst ? second : first;

        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return "";
        }

        return (
            `${year}-` +
            `${String(month).padStart(2, "0")}-` +
            String(day).padStart(2, "0")
        );
    }

    function getIsoDate() {
        return normalizeRoverFilterDate(
            getDateInput()?.value,
            {
                monthFirst:
                    getRoverViewKind() === ROVER_VIEW.RV2
            }
        );
    }


    function getClassicRowIsoDate(row) {
        if (!row) {
            return "";
        }

        /*
         * Resultados clásico muestra la fecha del evento como DD/MM/YYYY.
         * La fila es la fuente de autoridad porque el filtro global puede
         * conservar/normalizar una fecha ambigua con orden distinto.
         */
        const sources = [
            clean(row.getAttribute("data-content")),
            clean(row.innerText)
        ];

        for (const source of sources) {
            const match = source.match(
                /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
            );

            if (!match) {
                continue;
            }

            const [, dd, mm, yyyy] = match;

            const iso = normalizeRoverFilterDate(
                `${dd}/${mm}/${yyyy}`,
                {
                    monthFirst: false
                }
            );

            if (iso) {
                return iso;
            }
        }

        return "";
    }

    function dateFromRow(row) {
        /*
         * CLASSIC:
         *   La fecha concreta de la fila manda y siempre es DD/MM/YYYY.
         *   Ej.: 01/10/2026 => 2026-10-01.
         *
         * RV2:
         *   Conserva el flujo existente: el filtro #rv2_fecha es
         *   MM/DD/YYYY y sigue siendo la fuente primaria.
         */
        if (
            getRoverViewKind() ===
            ROVER_VIEW.CLASSIC
        ) {
            const rowIso =
                getClassicRowIsoDate(row);

            if (rowIso) {
                return rowIso;
            }

            return getIsoDate();
        }

        const globalIso = getIsoDate();

        if (globalIso) {
            return globalIso;
        }

        // Fallback de fila: DD/MM/YYYY.
        return getClassicRowIsoDate(row);
    }

    // ============================================================
    // MOD 04 - LEER EVENTOS ROVER
    // ============================================================

    function parseTeam(text) {
        const raw = clean(text);
        const match = raw.match(/^(\d+)\s+(.+)$/);

        if (!match) {
            return null;
        }

        return {
            roverCode: match[1],
            roverName: clean(match[2])
        };
    }

    function parseClassicRoverRow(row) {
        if (!row) {
            return null;
        }

        const cells = [...row.querySelectorAll("td")];
        if (cells.length < 3) {
            return null;
        }

        const ref = clean(cells[0].innerText).replace(/\D/g, "");
        if (!ref) {
            return null;
        }

        const away = parseTeam(cells[1].innerText);
        const home = parseTeam(cells[2].innerText);

        if (!away || !home) {
            return null;
        }

        const tkt = clean(row.getAttribute("tkt"));
        const onclick = row.getAttribute("onclick") || "";
        const onclickId = onclick.match(/ticketSelected\s*\(\s*['"]?(\d+)/)?.[1] || "";

        return {
            validIdentity:
                (!tkt || ref === tkt) &&
                (!onclickId || ref === onclickId),

            roverEventId: ref,
            date: dateFromRow(row),
            away,
            home,
            identity: {
                ref,
                tkt,
                onclick: onclickId
            },
            dataContent: row.getAttribute("data-content") || "",
            row
        };
    }

    function parseRv2RoverRow(row) {
        if (!row) return null;

        const cells = [...row.querySelectorAll("td")];

        if (cells.length < 3) {
            return null;
        }

        const ref = parseEventIdFromRow(row);
        const away = findRoverTeamByName(cells[1]?.innerText);
        const home = findRoverTeamByName(cells[2]?.innerText);

        if (!ref || !away || !home) {
            return null;
        }

        const onclickId = (row.getAttribute("onclick") || "")
            .match(/rv2_seleccionarEvento\s*\(\s*['"]?(\d+)/)?.[1] || "";

        const domId =
            clean(row.id).match(/^rv2-row-(\d+)$/)?.[1] || "";

        return {
            validIdentity:
                (!onclickId || onclickId === ref) &&
                (!domId || domId === ref),
            roverEventId: ref,
            date: dateFromRow(row),
            away,
            home,
            identity: {
                ref,
                tkt: "",
                onclick: onclickId,
                domId
            },
            dataContent: row.getAttribute("data-content") || "",
            row,
            view: ROVER_VIEW.RV2
        };
    }

    function parseRoverRow(row) {
        if (row?.matches?.(".rv2-event-row")) {
            return parseRv2RoverRow(row);
        }

        const parsed = parseClassicRoverRow(row);

        if (parsed) {
            parsed.view = ROVER_VIEW.CLASSIC;
        }

        return parsed;
    }

    function isRowVisible(row) {
        if (!row) {
            return false;
        }

        const style = getComputedStyle(row);
        return style.display !== "none" && style.visibility !== "hidden" && row.getClientRects().length > 0;
    }

    function getRoverEvents({ visibleOnly = true } = {}) {
        if (!requireCBBView()) return [];

        return getEventRows()
            .filter(row => !visibleOnly || isRowVisible(row))
            .map(parseRoverRow)
            .filter(Boolean);
    }

    function getCurrentRoverEvent() {
        if (!requireCBBView()) {
            return { valid: false, reason: "not_cbb" };
        }

        const editorId = getEditorEventId();

        if (!editorId) {
            return { valid: false, reason: "no_editor_event" };
        }

        const row = findEventRow(editorId);

        if (!row) {
            return {
                valid: false,
                reason: "row_not_found",
                roverEventId: editorId
            };
        }

        const parsed = parseRoverRow(row);

        if (!parsed) {
            return {
                valid: false,
                reason: "invalid_row",
                roverEventId: editorId
            };
        }

        const valid =
            parsed.validIdentity &&
            parsed.roverEventId === editorId;

        const rv2Identity =
            getRoverViewKind() ===
            ROVER_VIEW.RV2
                ? getRv2IdentityState({
                    requireEditor: true
                })
                : null;

        return {
            valid:
                valid &&
                (
                    !rv2Identity ||
                    rv2Identity.ok
                ),
            reason:
                valid &&
                (
                    !rv2Identity ||
                    rv2Identity.ok
                )
                    ? ""
                    : (
                        rv2Identity?.reason ||
                        "identity_mismatch"
                    ),
            roverEventId: parsed.roverEventId,
            date: parsed.date,
            away: parsed.away,
            home: parsed.home,
            view: parsed.view || getRoverViewKind(),
            identity: {
                editor: editorId,
                ...parsed.identity,
                rv2:
                    rv2Identity
            }
        };
    }


    async function waitForCurrentRoverEvent(timeoutMs = 3000) {
        const started = Date.now();
        let last = null;

        while (Date.now() - started < timeoutMs) {
            if (!isCBBView()) {
                return { valid: false, reason: "not_cbb" };
            }

            if (contextGate.dirty) {
                return {
                    valid: false,
                    reason: "filters_pending_search"
                };
            }

            last = getCurrentRoverEvent();

            if (last?.valid) {
                return last;
            }

            if (last?.reason !== "no_editor_event" && last?.reason !== "row_not_found") {
                return last;
            }

            await sleep(100);
        }

        return last || { valid: false, reason: "no_editor_event" };
    }

    // ============================================================
    // MOD 05 - TEAM MAP
    // ============================================================

    function getTeamMap(roverCode) {
        return TEAM_MAP[String(roverCode)] || null;
    }

    function mapStats() {
        const values = Object.values(TEAM_MAP);
        const mapped = values.filter(item => item?.espn_id).length;
        const foxMapped = values.filter(item => item?.fox_id).length;
        const unresolved = values.length - mapped;

        const result = {
            TOTAL: values.length,
            MAPEADOS: mapped,
            FOX_MAPEADOS: foxMapped,
            SIN_MAPEAR: unresolved
        };

        console.table([result]);
        return result;
    }

    // ============================================================
    // MOD 06 - HTTP ESPN + CACHES
    // ============================================================

    const SCOREBOARD_VARIANTS = [{ key: "NCAAM", group: "50" }];

    const CACHE_TTL_MS = 5 * 60 * 1000;
    const GAME_SUMMARY_CACHE_TTL_MS = 10 * 1000;

    const scoreboardCache = new Map();
    const scoreboardInFlight = new Map();
    let scoreboardCacheEpoch = 0;
    const teamScheduleCache = new Map();
    const teamScheduleInFlight = new Map();
    const gameSummaryCache = new Map();
    const autoLinkInFlight = new Map();

    /*
     * Fast path v0.7.7:
     * - activeLinkCache evita resolver scoreboards/schedules otra vez al pulsar ↻.
     * - gameSummaryInFlight evita solicitudes summary duplicadas por doble click.
     */
    const activeLinkCache = new Map();
    const gameSummaryInFlight = new Map();

    function normalizeEspnRequestUrl(input) {
        let url = String(input || "").trim();

        // Defensive cleanup in case a URL is accidentally wrapped as Markdown.
        const markdownMatch = url.match(
            /^\[(https?:\/\/[^\]]+)\]\((https?:\/\/[^)]+)\)$/
        );

        if (markdownMatch) {
            url = markdownMatch[1];
        }

        url = url
            .replace(/\\&/g, "&")
            .replace(/\\</g, "<")
            .replace(/\\>/g, ">")
            .trim();

        if (url.startsWith("<") && url.endsWith(">")) {
            url = url.slice(1, -1).trim();
        }

        let parsed;

        try {
            parsed = new URL(url);
        } catch {
            throw new Error(`URL ESPN inválida: ${url}`);
        }

        if (parsed.protocol !== "https:") {
            throw new Error(
                `Protocolo ESPN no permitido: ${parsed.protocol}`
            );
        }

        if (parsed.hostname !== "site.api.espn.com") {
            throw new Error(
                `Host ESPN no permitido: ${parsed.hostname}`
            );
        }

        return parsed.href;
    }

    function espnGet(url) {
        const safeUrl = normalizeEspnRequestUrl(url);

        if (
            typeof GM !== "undefined" &&
            typeof GM.xmlHttpRequest === "function"
        ) {

            return GM.xmlHttpRequest({
                method: "GET",
                url: safeUrl,
                headers: {
                    Accept: "application/json"
                },
                timeout: 15000
            }).then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(`ESPN HTTP ${response.status}`);
                }

                try {
                    return JSON.parse(response.responseText);
                } catch {
                    throw new Error("ESPN devolvió JSON inválido");
                }
            });
        }

        if (typeof GM_xmlhttpRequest === "function") {

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: safeUrl,
                    headers: {
                        Accept: "application/json"
                    },
                    timeout: 15000,

                    onload(response) {
                        if (
                            response.status < 200 ||
                            response.status >= 300
                        ) {
                            reject(
                                new Error(
                                    `ESPN HTTP ${response.status}`
                                )
                            );
                            return;
                        }

                        try {
                            resolve(
                                JSON.parse(response.responseText)
                            );
                        } catch {
                            reject(
                                new Error(
                                    "ESPN devolvió JSON inválido"
                                )
                            );
                        }
                    },

                    onerror(error) {
                        reject(error);
                    },

                    ontimeout() {
                        reject(new Error("ESPN timeout"));
                    }
                });
            });
        }

        return Promise.reject(
            new Error(
                "Tampermonkey no expuso GM.xmlHttpRequest ni GM_xmlhttpRequest"
            )
        );
    }


    async function diagHttp() {
        const rawUrl =
            "https://site.api.espn.com/apis/site/v2/sports/" +
            "basketball/mens-college-basketball/teams?limit=1";

        const normalizedUrl =
            normalizeEspnRequestUrl(rawUrl);

        const startedAt = performance.now();

        console.log("==============================================");
        console.log(`ESPN CBB HTTP DIAGNOSTIC v${VERSION}`);
        console.log("==============================================");

        console.table([{
            RAW_URL: rawUrl,
            NORMALIZED_URL: normalizedUrl,
            HOST: new URL(normalizedUrl).hostname,
            CONNECT_EXPECTED: "site.api.espn.com"
        }]);

        try {
            const data = await espnGet(normalizedUrl);
            const elapsedMs =
                Math.round(performance.now() - startedAt);

            const count =
                data?.sports?.[0]?.leagues?.[0]?.teams?.length ??
                data?.teams?.length ??
                "";

            const result = {
                ok: true,
                elapsedMs,
                normalizedUrl,
                teamCount: count
            };

            console.log(
                `${TAG} ✅ HTTP/@connect OK en ${elapsedMs} ms.`
            );
            console.table([result]);

            return result;
        } catch (error) {
            const elapsedMs =
                Math.round(performance.now() - startedAt);

            const result = {
                ok: false,
                elapsedMs,
                normalizedUrl,
                error:
                    clean(error?.message) ||
                    clean(error?.error) ||
                    String(error)
            };

            console.error(
                `${TAG} ❌ HTTP/@connect FALLÓ en ${elapsedMs} ms.`,
                error
            );
            console.table([result]);

            return result;
        }
    }

    function getFreshCache(cache, key) {
        const item = cache.get(key);

        if (!item) {
            return null;
        }

        if (Date.now() - item.fetchedAt > CACHE_TTL_MS) {
            cache.delete(key);
            return null;
        }

        return item.value;
    }

    function setCache(cache, key, value) {
        cache.set(key, {
            fetchedAt: Date.now(),
            value
        });

        return value;
    }

    function roverLinkSignature(rover) {
        if (!rover?.valid) {
            return "";
        }

        return [
            String(rover.roverEventId || ""),
            clean(rover.date || ""),
            String(rover.away?.roverCode || ""),
            String(rover.home?.roverCode || "")
        ].join("|");
    }

    function invalidateActiveLink(roverEventId) {
        const id = String(roverEventId || "").trim();

        if (!id) {
            return false;
        }

        return activeLinkCache.delete(id);
    }

    function setActiveAutoLink(rover, result) {
        if (!rover?.valid) {
            return null;
        }

        const eventId = String(result?.ESPN_EVENT_ID || "").trim();

        if (
            !/^\d+$/.test(eventId) ||
            !acceptedAutoLinkStatus(result?.ESTADO)
        ) {
            invalidateActiveLink(rover.roverEventId);
            return null;
        }

        const item = {
            roverEventId: String(rover.roverEventId),
            signature: roverLinkSignature(rover),
            espnEventId: eventId,
            mode: "AUTO",
            source: clean(result?.FUENTE || result?.ESTADO || "AUTO"),
            pairOrder:
                result?.ESTADO === "REVERSED_PAIR"
                    ? "REVERSED"
                    : "EXACT",
            status: clean(result?.ESTADO || ""),
            writableHint: Boolean(result?.ESPN_WRITABLE_HINT),
            scoreboardPeriod: Number(result?.ESPN_SCOREBOARD_PERIOD || 0) || 0,
            scoreboardStatus: clean(result?.ESPN_SCOREBOARD_STATUS || ""),
            storedAt: Date.now()
        };

        activeLinkCache.set(item.roverEventId, item);
        return item;
    }

    function promoteActiveLinkGameState(
        rover,
        game
    ) {
        const item =
            getActiveAutoLink(rover);

        if (!item || !game) {
            return false;
        }

        item.lastGameStatus =
            clean(game.status?.normalized);
        item.lastGamePeriod =
            Number(game.status?.period || 0);
        item.lastGameClock =
            clean(game.status?.clock);
        item.lastGameObservedAt =
            Date.now();

        return true;
    }

    function getActiveAutoLink(rover) {
        if (!rover?.valid) {
            return null;
        }

        const id = String(rover.roverEventId || "");
        const item = activeLinkCache.get(id);

        if (!item) {
            return null;
        }

        const signature = roverLinkSignature(rover);

        if (
            !signature ||
            item.signature !== signature ||
            !/^\d+$/.test(String(item.espnEventId || ""))
        ) {
            activeLinkCache.delete(id);
            return null;
        }

        return item;
    }

    function clearCache() {
        scoreboardCacheEpoch += 1;
        scoreboardCache.clear();
        scoreboardInFlight.clear();
        teamScheduleCache.clear();
        teamScheduleInFlight.clear();
        gameSummaryCache.clear();
        activeLinkCache.clear();
        autoLinkInFlight.clear();
        gameSummaryInFlight.clear();

        foxGameLogs.clear();
        foxSchedules.clear();
        foxEvents.clear();
        foxLinks.clear();
        foxGameLogInFlight.clear();
        foxScheduleInFlight.clear();
        foxEventInFlight.clear();
        foxLinkInFlight.clear();
        rowPrewarmInFlight.clear();

        console.log(
            `${TAG} Cachés ESPN/FOX limpiadas.`
        );
    }

    // ============================================================
    // MOD 07 - NORMALIZAR / INDEXAR ESPN
    // ============================================================

    function easternDateFromEspnDate(value) {
        if (!value) {
            return "";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        try {
            const parts = new Intl.DateTimeFormat("en-US", {
                timeZone: "America/New_York",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(date);

            const values = Object.fromEntries(
                parts
                    .filter(part => part.type !== "literal")
                    .map(part => [part.type, part.value])
            );

            if (!values.year || !values.month || !values.day) {
                return "";
            }

            return `${values.year}-${values.month}-${values.day}`;
        } catch (_) {
            return "";
        }
    }

    function parseEspnEvent(event, source = "UNKNOWN") {
        const competition = event?.competitions?.[0];
        if (!competition) {
            return null;
        }

        const competitors = competition.competitors || [];
        const away = competitors.find(x => x.homeAway === "away");
        const home = competitors.find(x => x.homeAway === "home");

        if (!away || !home) {
            return null;
        }

        const eventId = String(event.id || "");
        if (!eventId) {
            return null;
        }

        const rawStatus = competition?.status || event?.status || {};
        const statusType = rawStatus?.type || {};
        const statusText = upper(
            statusType?.name ||
            statusType?.description ||
            statusType?.detail ||
            statusType?.shortDetail ||
            ""
        );
        const scoreboardPeriod = Number(rawStatus?.period || 0) || 0;
        const writableHint =
            Boolean(statusType?.completed) ||
            /\b(HALF|HALFTIME|FINAL)\b/.test(statusText) ||
            scoreboardPeriod >= 2;

        return {
            eventId,
            date: event.date || "",
            easternDate: easternDateFromEspnDate(event.date),
            name: clean(event.name || event.shortName),
            awayEspnId: String(away.team?.id || ""),
            away: clean(away.team?.displayName || away.team?.name),
            homeEspnId: String(home.team?.id || ""),
            home: clean(home.team?.displayName || home.team?.name),
            scoreboardState: clean(statusType?.state || ""),
            scoreboardStatus: statusText,
            scoreboardPeriod,
            writableHint,
            sources: [source]
        };
    }

    function pairKey(awayEspnId, homeEspnId) {
        return `${String(awayEspnId)}>${String(homeEspnId)}`;
    }

    function mergeEspnEvents(collections) {
        const byId = new Map();

        for (const events of collections) {
            for (const event of events || []) {
                if (!event?.eventId) {
                    continue;
                }

                const existing = byId.get(event.eventId);

                if (!existing) {
                    byId.set(event.eventId, {
                        ...event,
                        sources: [...new Set(event.sources || [])]
                    });
                    continue;
                }

                existing.sources = [
                    ...new Set([
                        ...(existing.sources || []),
                        ...(event.sources || [])
                    ])
                ];

                if (!existing.name && event.name) {
                    existing.name = event.name;
                }

                if (!existing.date && event.date) {
                    existing.date = event.date;
                    existing.easternDate = event.easternDate;
                }

                if (
                    event.writableHint &&
                    !existing.writableHint
                ) {
                    existing.writableHint = true;
                }

                if (
                    Number(event.scoreboardPeriod || 0) >
                    Number(existing.scoreboardPeriod || 0)
                ) {
                    existing.scoreboardPeriod =
                        Number(event.scoreboardPeriod || 0);
                    existing.scoreboardStatus =
                        event.scoreboardStatus ||
                        existing.scoreboardStatus;
                    existing.scoreboardState =
                        event.scoreboardState ||
                        existing.scoreboardState;
                }
            }
        }

        return [...byId.values()];
    }

    function buildEspnPairIndex(events) {
        const index = new Map();

        for (const event of events) {
            const key = pairKey(event.awayEspnId, event.homeEspnId);

            if (!index.has(key)) {
                index.set(key, []);
            }

            index.get(key).push(event);
        }

        return index;
    }

    function exactStatusForEvent(event) {
        return event?.sources?.includes("NCAAM") ? "EXACT_SCOREBOARD_NCAAM"
            : event?.sources?.includes("TEAM_SCHEDULE") ? "EXACT_TEAM_SCHEDULE" : "EXACT";
    }

    function acceptedExactStatus(status) {
        return String(status || "").startsWith("EXACT_") || status === "EXACT";
    }

    function acceptedAutoLinkStatus(status) {
        return acceptedExactStatus(status) || status === "REVERSED_PAIR";
    }

    // ============================================================
    // MOD 08 - SCOREBOARD NCAA MASCULINO (GROUPS=50)
    // ============================================================

    async function fetchScoreboardVariant(dateIso, variant) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
            throw new Error(`Fecha ISO inválida: ${dateIso || "(vacía)"}`);
        }

        const dateParam = dateIso.replace(/-/g, "");
        let url =
            "https://site.api.espn.com/apis/site/v2/sports/" +
            "basketball/mens-college-basketball/scoreboard" +
            `?dates=${dateParam}&limit=1000`;

        if (variant.group) {
            url += `&groups=${encodeURIComponent(variant.group)}`;
        }

        const data = await espnGet(url);
        const events = (data.events || [])
            .map(event => parseEspnEvent(event, variant.key))
            .filter(Boolean);

        return {
            key: variant.key,
            group: variant.group,
            url,
            raw: data,
            events
        };
    }

    async function fetchAllScoreboards(dateIso, { useCache = true } = {}) {
        const cacheKey = `scoreboards:${dateIso}`;

        if (useCache) {
            const cached = getFreshCache(scoreboardCache, cacheKey);
            if (cached) {
                console.log(`${TAG} ESPN ${dateIso}: usando caché de scoreboards.`);
                return cached;
            }
        }

        const pending = scoreboardInFlight.get(cacheKey);
        if (pending) return pending;

        const request = fetchAllScoreboardsUncached(dateIso, cacheKey, scoreboardCacheEpoch);
        scoreboardInFlight.set(cacheKey, request);
        try {
            return await request;
        } finally {
            if (scoreboardInFlight.get(cacheKey) === request) {
                scoreboardInFlight.delete(cacheKey);
            }
        }
    }

    async function fetchAllScoreboardsUncached(dateIso, cacheKey, cacheEpoch) {

        const collections = [];
        const variants = {};
        const errors = {};

        if (!isCBBView()) {
            throw new Error("La vista dejó de ser BASKETBALL > CBB");
        }

        const responses = await Promise.allSettled(
            SCOREBOARD_VARIANTS.map(variant => fetchScoreboardVariant(dateIso, variant))
        );

        if (!isCBBView()) {
            throw new Error("La vista dejó de ser BASKETBALL > CBB");
        }

        for (const [index, response] of responses.entries()) {
            const variant = SCOREBOARD_VARIANTS[index];
            if (response.status === "fulfilled") {
                const result = response.value;
                variants[variant.key] = result;
                collections.push(result.events);
            } else {
                errors[variant.key] = response.reason;
                console.error(`${TAG} ESPN ${dateIso} [${variant.key}]: error`, response.reason);
            }
        }

        if (!collections.length) {
            throw new Error(`Fallaron todos los scoreboards ESPN para ${dateIso}`);
        }

        const events = mergeEspnEvents(collections);
        const result = {
            date: dateIso,
            events,
            index: buildEspnPairIndex(events),
            variants,
            errors
        };

        console.log(
            `${TAG} ESPN ${dateIso}: ${events.length} evento(s) únicos tras NCAA masculino (groups=50).`
        );

        return cacheEpoch === scoreboardCacheEpoch
            ? setCache(scoreboardCache, cacheKey, result)
            : result;
    }

    // ============================================================
    // MOD 09 - TEAM SCHEDULE FALLBACK
    // ============================================================

    async function fetchTeamSchedule(
        teamId,
        season,
        { useCache = true } = {}
    ) {
        const id = String(teamId || "");
        const year = String(season || "");
        const cacheKey = `schedule:${year}:${id}`;

        if (!id || !/^\d{4}$/.test(year)) {
            throw new Error(
                `Team schedule inválido: team=${id}, season=${year}`
            );
        }

        if (useCache) {
            const cached = getFreshCache(
                teamScheduleCache,
                cacheKey
            );

            if (cached) {
                console.log(
                    `${TAG} TEAM SCHEDULE ${id}/${year}: caché.`
                );
                return cached;
            }
        }

        return singleFlight(
            teamScheduleInFlight,
            cacheKey,
            async () => {
                const url =
                    "https://site.api.espn.com/apis/site/v2/sports/" +
                    `basketball/mens-college-basketball/teams/${encodeURIComponent(id)}/schedule` +
                    `?season=${encodeURIComponent(year)}`;

                console.log(
                    `${TAG} TEAM SCHEDULE ${id}/${year}: consultando...`
                );

                const data = await espnGet(url);

                const events = (data.events || [])
                    .map(event =>
                        parseEspnEvent(
                            event,
                            "TEAM_SCHEDULE"
                        )
                    )
                    .filter(Boolean);

                const result = {
                    teamId: id,
                    season: year,
                    url,
                    raw: data,
                    events
                };

                console.log(
                    `${TAG} TEAM SCHEDULE ${id}/${year}: ${events.length} evento(s).`
                );

                return setCache(
                    teamScheduleCache,
                    cacheKey,
                    result
                );
            }
        );
    }


    function matchEventsForRoverDate(rover, events, awayMap, homeMap) {
        const sameDate = (events || []).filter(event =>
            !event.easternDate || event.easternDate === rover.date
        );

        const exact = sameDate.filter(event =>
            event.awayEspnId === String(awayMap.espn_id) &&
            event.homeEspnId === String(homeMap.espn_id)
        );

        if (exact.length === 1) {
            return {
                status: "EXACT_TEAM_SCHEDULE",
                awayMap,
                homeMap,
                match: exact[0],
                candidates: exact
            };
        }

        if (exact.length > 1) {
            return {
                status: "MULTIPLE_MATCHES",
                awayMap,
                homeMap,
                candidates: exact
            };
        }

        const reversed = sameDate.filter(event =>
            event.awayEspnId === String(homeMap.espn_id) &&
            event.homeEspnId === String(awayMap.espn_id)
        );

        if (reversed.length === 1) {
            return {
                status: "REVERSED_PAIR",
                awayMap,
                homeMap,
                match: reversed[0],
                candidates: reversed
            };
        }

        if (reversed.length > 1) {
            return {
                status: "MULTIPLE_MATCHES",
                awayMap,
                homeMap,
                candidates: reversed
            };
        }

        return {
            status: "NOT_FOUND",
            awayMap,
            homeMap,
            candidates: []
        };
    }

    async function matchViaTeamSchedule(rover, { useCache = true } = {}) {
        const awayMap = getTeamMap(rover.away.roverCode);
        const homeMap = getTeamMap(rover.home.roverCode);

        if (!awayMap?.espn_id) {
            return {
                status: "NO_MAP_AWAY",
                awayMap,
                homeMap,
                candidates: []
            };
        }

        if (!homeMap?.espn_id) {
            return {
                status: "NO_MAP_HOME",
                awayMap,
                homeMap,
                candidates: []
            };
        }

        const season = basketballSeasonYear(rover.date);
        const collections = [];
        const tried = new Set();

        for (const teamId of [awayMap.espn_id, homeMap.espn_id]) {
            const id = String(teamId);

            if (tried.has(id)) {
                continue;
            }

            tried.add(id);

            if (!isCBBView()) {
                return {
                    status: "CANCELLED_CONTEXT_CHANGED",
                    awayMap,
                    homeMap,
                    candidates: []
                };
            }

            try {
                const schedule = await fetchTeamSchedule(id, season, { useCache });
                collections.push(schedule.events);

                const merged = mergeEspnEvents(collections);
                const matched = matchEventsForRoverDate(
                    rover,
                    merged,
                    awayMap,
                    homeMap
                );

                if (matched.status !== "NOT_FOUND") {
                    return matched;
                }
            } catch (error) {
                console.warn(
                    `${TAG} TEAM SCHEDULE ${id}/${season}: no disponible para Rover #${rover.roverEventId}`,
                    error
                );
            }

            // Evita ráfagas largas de peticiones al resolver muchos faltantes.
            await sleep(75);
        }

        return {
            status: "NOT_FOUND",
            awayMap,
            homeMap,
            candidates: []
        };
    }

    // ============================================================
    // MOD 10 - MATCH ENGINE
    // ============================================================

    function matchRoverEvent(rover, espnIndex) {
        const awayMap = getTeamMap(rover.away.roverCode);
        const homeMap = getTeamMap(rover.home.roverCode);

        if (!awayMap?.espn_id) {
            return {
                status: "NO_MAP_AWAY",
                awayMap,
                homeMap,
                candidates: []
            };
        }

        if (!homeMap?.espn_id) {
            return {
                status: "NO_MAP_HOME",
                awayMap,
                homeMap,
                candidates: []
            };
        }

        const exact = espnIndex.get(
            pairKey(awayMap.espn_id, homeMap.espn_id)
        ) || [];

        if (exact.length === 1) {
            return {
                status: exactStatusForEvent(exact[0]),
                awayMap,
                homeMap,
                match: exact[0],
                candidates: exact
            };
        }

        if (exact.length > 1) {
            return {
                status: "MULTIPLE_MATCHES",
                awayMap,
                homeMap,
                candidates: exact
            };
        }

        const reversed = espnIndex.get(
            pairKey(homeMap.espn_id, awayMap.espn_id)
        ) || [];

        if (reversed.length === 1) {
            return {
                status: "REVERSED_PAIR",
                awayMap,
                homeMap,
                match: reversed[0],
                candidates: reversed
            };
        }

        if (reversed.length > 1) {
            return {
                status: "MULTIPLE_MATCHES",
                awayMap,
                homeMap,
                candidates: reversed
            };
        }

        return {
            status: "NOT_FOUND",
            awayMap,
            homeMap,
            candidates: []
        };
    }

    function toResultRow(rover, matched) {
        const match = matched.match || null;
        const accepted = acceptedAutoLinkStatus(matched.status);

        return {
            ROVER_EVENT_ID: rover.roverEventId,
            FECHA: rover.date,
            ROVER_AWAY_COD: rover.away.roverCode,
            ROVER_AWAY: rover.away.roverName,
            ROVER_AWAY_ESPN_ID: matched.awayMap?.espn_id || "",
            ROVER_HOME_COD: rover.home.roverCode,
            ROVER_HOME: rover.home.roverName,
            ROVER_HOME_ESPN_ID: matched.homeMap?.espn_id || "",
            ACTUAL_ESPN_AWAY_ID: match?.awayEspnId || "",
            ACTUAL_ESPN_AWAY: match?.away || "",
            ACTUAL_ESPN_HOME_ID: match?.homeEspnId || "",
            ACTUAL_ESPN_HOME: match?.home || "",
            ESPN_EVENT_ID: accepted ? (match?.eventId || "") : "",
            ESPN_EVENT: match?.name || "",
            ESPN_DATE: match?.date || "",
            ESPN_DATE_ET: match?.easternDate || "",
            ESPN_SCOREBOARD_STATE: match?.scoreboardState || "",
            ESPN_SCOREBOARD_STATUS: match?.scoreboardStatus || "",
            ESPN_SCOREBOARD_PERIOD: Number(match?.scoreboardPeriod || 0) || 0,
            ESPN_WRITABLE_HINT: Boolean(match?.writableHint),
            FUENTE: (match?.sources || []).join("+"),
            ESTADO: matched.status,
            ORDEN: matched.status === "REVERSED_PAIR" ? "INVERTIDO" : "NORMAL"
        };
    }

    // ============================================================
    // MOD 11 - RESOLVER EVENTO SELECCIONADO
    // ============================================================

    async function resolve(options = {}) {
        console.log("==============================================");
        console.log(`ESPN CBB AUTO RESOLVER v${VERSION}`);
        console.log("==============================================");

        if (!requireCBBView()) {
            return null;
        }

        console.log(`${TAG} ✅ BASKETBALL > CBB confirmado.`);

        const rover = await waitForCurrentRoverEvent();
        console.log(`${TAG} Rover:`, rover);

        if (!rover?.valid) {
            console.error(`${TAG} Evento Rover inválido:`, rover);
            return null;
        }

        if (!rover.date) {
            console.error(`${TAG} No encontré fecha ISO.`);
            return null;
        }

        const awayMap = getTeamMap(rover.away.roverCode);
        const homeMap = getTeamMap(rover.home.roverCode);

        if (!awayMap?.espn_id) {
            console.error(`${TAG} COD AWAY ${rover.away.roverCode} no tiene ESPN ID.`, awayMap);
            return null;
        }

        if (!homeMap?.espn_id) {
            console.error(`${TAG} COD HOME ${rover.home.roverCode} no tiene ESPN ID.`, homeMap);
            return null;
        }

        console.log(
            `${TAG} AWAY: ${rover.away.roverCode} ${rover.away.roverName} → ${awayMap.espn_id} ${awayMap.espn_name}`
        );

        console.log(
            `${TAG} HOME: ${rover.home.roverCode} ${rover.home.roverName} → ${homeMap.espn_id} ${homeMap.espn_name}`
        );

        console.log(`${TAG} Fecha: ${rover.date}`);

        let day;

        try {
            day = await fetchAllScoreboards(rover.date, {
                useCache: options.useCache !== false
            });
        } catch (error) {
            console.error(`${TAG} ❌ Error ESPN:`, error);
            return null;
        }

        if (!isCBBView()) {
            console.warn(`${TAG} ⚠️ La vista dejó de ser CBB. Respuesta descartada.`);
            return null;
        }

        let matched = matchRoverEvent(rover, day.index);

        if (
            matched.status === "NOT_FOUND" &&
            options.scheduleFallback !== false
        ) {
            console.log(`${TAG} No apareció en scoreboards; probando TEAM SCHEDULE...`);
            matched = await matchViaTeamSchedule(rover, {
                useCache: options.useCache !== false
            });
        }

        const result = toResultRow(rover, matched);
        expose("__ESPN_CBB_LAST_MATCH", result);

        if (!acceptedAutoLinkStatus(matched.status)) {
            console.error(`${TAG} ❌ Match no confirmado: ${matched.status}`);

            if (matched.candidates?.length) {
                console.table(matched.candidates);
            }

            console.table([result]);
            return result;
        }

        console.log("");
        console.log(`✅ MATCH AUTOMÁTICO CONFIRMADO — ${matched.status}`);
        console.table([result]);

        return result;
    }

    // ============================================================
    // MOD 12 - ESCANEAR TODOS LOS EVENTOS VISIBLES
    // Scoreboard NCAA masculino por fecha: groups=50.
    // Solo los NOT_FOUND pasan al fallback TEAM SCHEDULE.
    // ============================================================

    async function scanAll(options = {}) {
        if (!requireCBBView()) {
            return [];
        }

        const visibleOnly = options.visibleOnly !== false;
        const scheduleFallback = options.scheduleFallback !== false;
        const useCache = options.useCache !== false;
        const roverEvents = getRoverEvents({ visibleOnly });

        if (!roverEvents.length) {
            console.warn(`${TAG} No encontré eventos Rover para escanear.`);
            return [];
        }

        const invalidIdentity = roverEvents.filter(event => !event.validIdentity);
        if (invalidIdentity.length) {
            console.warn(
                `${TAG} ⚠️ ${invalidIdentity.length} fila(s) tienen REF/TKT/onclick inconsistentes; no se enlazarán.`
            );
        }

        const dates = [...new Set(
            roverEvents
                .map(event => event.date)
                .filter(Boolean)
        )];

        if (!dates.length) {
            console.error(`${TAG} No se pudo determinar ninguna fecha ISO.`);
            return [];
        }

        console.log(
            `${TAG} Escaneando ${roverEvents.length} evento(s) Rover en ${dates.length} fecha(s): ${dates.join(", ")}`
        );

        console.log(
            `${TAG} Fuentes: SCOREBOARD NCAA masculino groups=50` +
            (scheduleFallback ? " + TEAM SCHEDULE fallback." : ".")
        );

        const espnByDate = new Map();
        const errorsByDate = new Map();

        for (const date of dates) {
            if (!isCBBView()) {
                console.warn(`${TAG} La vista dejó de ser CBB. Escaneo cancelado.`);
                return [];
            }

            try {
                const day = await fetchAllScoreboards(date, { useCache });
                espnByDate.set(date, day);
            } catch (error) {
                errorsByDate.set(date, error);
                console.error(`${TAG} ESPN ${date}: error total`, error);
            }
        }

        const results = [];
        const pendingFallback = [];

        for (const rover of roverEvents) {
            if (!rover.validIdentity) {
                results.push({
                    ROVER_EVENT_ID: rover.roverEventId,
                    FECHA: rover.date,
                    ROVER_AWAY_COD: rover.away.roverCode,
                    ROVER_AWAY: rover.away.roverName,
                    ROVER_AWAY_ESPN_ID: "",
                    ROVER_HOME_COD: rover.home.roverCode,
                    ROVER_HOME: rover.home.roverName,
                    ROVER_HOME_ESPN_ID: "",
                    ESPN_EVENT_ID: "",
                    ESPN_EVENT: "",
                    ESPN_DATE: "",
                    ESPN_DATE_ET: "",
                    FUENTE: "",
                    ESTADO: "ROVER_ID_MISMATCH"
                });
                continue;
            }

            if (!rover.date) {
                results.push({
                    ROVER_EVENT_ID: rover.roverEventId,
                    FECHA: "",
                    ROVER_AWAY_COD: rover.away.roverCode,
                    ROVER_AWAY: rover.away.roverName,
                    ROVER_AWAY_ESPN_ID: "",
                    ROVER_HOME_COD: rover.home.roverCode,
                    ROVER_HOME: rover.home.roverName,
                    ROVER_HOME_ESPN_ID: "",
                    ESPN_EVENT_ID: "",
                    ESPN_EVENT: "",
                    ESPN_DATE: "",
                    ESPN_DATE_ET: "",
                    FUENTE: "",
                    ESTADO: "NO_DATE"
                });
                continue;
            }

            if (errorsByDate.has(rover.date)) {
                results.push({
                    ROVER_EVENT_ID: rover.roverEventId,
                    FECHA: rover.date,
                    ROVER_AWAY_COD: rover.away.roverCode,
                    ROVER_AWAY: rover.away.roverName,
                    ROVER_AWAY_ESPN_ID: getTeamMap(rover.away.roverCode)?.espn_id || "",
                    ROVER_HOME_COD: rover.home.roverCode,
                    ROVER_HOME: rover.home.roverName,
                    ROVER_HOME_ESPN_ID: getTeamMap(rover.home.roverCode)?.espn_id || "",
                    ESPN_EVENT_ID: "",
                    ESPN_EVENT: "",
                    ESPN_DATE: "",
                    ESPN_DATE_ET: "",
                    FUENTE: "",
                    ESTADO: "ESPN_ERROR"
                });
                continue;
            }

            const day = espnByDate.get(rover.date);
            if (!day) {
                continue;
            }

            const matched = matchRoverEvent(rover, day.index);

            if (matched.status === "NOT_FOUND" && scheduleFallback) {
                const rowIndex = results.length;
                results.push(toResultRow(rover, matched));
                pendingFallback.push({ rover, rowIndex });
            } else {
                results.push(toResultRow(rover, matched));
            }
        }

        if (pendingFallback.length) {
            console.log(
                `${TAG} ${pendingFallback.length} evento(s) siguen NOT_FOUND tras los 3 scoreboards; iniciando TEAM SCHEDULE fallback...`
            );

            let done = 0;

            for (const item of pendingFallback) {
                if (!isCBBView()) {
                    console.warn(`${TAG} La vista dejó de ser CBB. Fallback cancelado.`);
                    break;
                }

                done += 1;
                console.log(
                    `${TAG} Fallback ${done}/${pendingFallback.length} — Rover #${item.rover.roverEventId}: ` +
                    `${item.rover.away.roverName} @ ${item.rover.home.roverName}`
                );

                const matched = await matchViaTeamSchedule(item.rover, { useCache });
                results[item.rowIndex] = toResultRow(item.rover, matched);
            }
        }

        const summary = results.reduce((acc, row) => {
            acc[row.ESTADO] = (acc[row.ESTADO] || 0) + 1;
            return acc;
        }, {});

        expose("__ESPN_CBB_LAST_SCAN", results);

        console.log("");
        console.log("=== ESPN CBB SCAN ALL ===");
        console.table(results);
        console.log("=== RESUMEN ===");
        console.table(
            Object.entries(summary).map(([ESTADO, TOTAL]) => ({ ESTADO, TOTAL }))
        );

        return results;
    }

    // ============================================================
    // MOD 13 - OVERRIDES PERSISTENTES AUTO / MANUAL / DISABLED
    // Regla:
    //   sin override  -> AUTO
    //   manual        -> el ESPN Event ID guardado gana
    //   disabled      -> AUTO queda desactivado hasta pulsar AUTO
    // ============================================================

    const OVERRIDE_PREFIX = "rs_espn_cbb_override_v1_";

    function overrideKey(roverEventId) {
        return `${OVERRIDE_PREFIX}${String(roverEventId || "")}`;
    }

    function getOverride(roverEventId) {
        const id = String(roverEventId || "");
        if (!id) {
            return null;
        }

        try {
            const raw = localStorage.getItem(overrideKey(id));
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            if (!parsed || !["manual", "disabled"].includes(parsed.mode)) {
                return null;
            }

            return parsed;
        } catch (error) {
            console.warn(`${TAG} Override inválido para Rover #${id}`, error);
            return null;
        }
    }

    function saveOverride(roverEventId, value) {
        const id = String(roverEventId || "");
        if (!id) {
            return false;
        }

        try {
            localStorage.setItem(
                overrideKey(id),
                JSON.stringify({
                    ...value,
                    roverEventId: id,
                    updatedAt: new Date().toISOString()
                })
            );
            return true;
        } catch (error) {
            console.error(`${TAG} No pude guardar override para Rover #${id}`, error);
            return false;
        }
    }

    function removeOverride(roverEventId) {
        const id = String(roverEventId || "");
        if (!id) {
            return false;
        }

        try {
            localStorage.removeItem(overrideKey(id));
            return true;
        } catch (error) {
            console.error(`${TAG} No pude eliminar override para Rover #${id}`, error);
            return false;
        }
    }

    function setDisabled(roverEventId) {
        invalidateActiveLink(roverEventId);

        return saveOverride(roverEventId, {
            mode: "disabled"
        });
    }

    function setManualOverride(roverEventId, event) {
        invalidateActiveLink(roverEventId);

        const id = String(event?.eventId || event?.espnEventId || "").trim();
        if (!/^\d+$/.test(id)) {
            throw new Error("ESPN Event ID manual inválido");
        }

        return saveOverride(roverEventId, {
            mode: "manual",
            manualLocked: true,
            espnEventId: id,
            eventName: clean(event?.name || event?.eventName || `ESPN Event #${id}`),
            espnDate: event?.date || event?.espnDate || "",
            espnDateEt: event?.easternDate || event?.espnDateEt || "",
            awayEspnId: String(event?.awayEspnId || ""),
            awayName: clean(event?.away || event?.awayName || ""),
            homeEspnId: String(event?.homeEspnId || ""),
            homeName: clean(event?.home || event?.homeName || ""),
            source: clean((event?.sources || []).join("+") || event?.source || "MANUAL")
        });
    }

    function clearOverrides() {
        let removed = 0;

        try {
            for (let i = localStorage.length - 1; i >= 0; i -= 1) {
                const key = localStorage.key(i);
                if (key?.startsWith(OVERRIDE_PREFIX)) {
                    localStorage.removeItem(key);
                    removed += 1;
                }
            }
        } catch (error) {
            console.error(`${TAG} Error limpiando overrides`, error);
        }

        console.log(`${TAG} Overrides eliminados: ${removed}`);
        return removed;
    }

    // ============================================================
    // MOD 14 - RESOLVER AUTO PARA UI
    // ============================================================

    async function resolveRoverAuto(rover, {
        useCache = true,
        scheduleFallback = true
    } = {}) {
        const awayMap = getTeamMap(rover?.away?.roverCode);
        const homeMap = getTeamMap(rover?.home?.roverCode);

        if (!awayMap?.espn_id) {
            return toResultRow(rover, {
                status: "NO_MAP_AWAY",
                awayMap,
                homeMap,
                candidates: []
            });
        }

        if (!homeMap?.espn_id) {
            return toResultRow(rover, {
                status: "NO_MAP_HOME",
                awayMap,
                homeMap,
                candidates: []
            });
        }

        let day;
        try {
            day = await fetchAllScoreboards(rover.date, { useCache });
        } catch (error) {
            console.error(`${TAG} Error consultando scoreboards para Rover #${rover.roverEventId}`, error);
            return {
                ROVER_EVENT_ID: rover.roverEventId,
                FECHA: rover.date,
                ROVER_AWAY_COD: rover.away.roverCode,
                ROVER_AWAY: rover.away.roverName,
                ROVER_AWAY_ESPN_ID: awayMap.espn_id || "",
                ROVER_HOME_COD: rover.home.roverCode,
                ROVER_HOME: rover.home.roverName,
                ROVER_HOME_ESPN_ID: homeMap.espn_id || "",
                ESPN_EVENT_ID: "",
                ESPN_EVENT: "",
                ESPN_DATE: "",
                ESPN_DATE_ET: "",
                FUENTE: "",
                ESTADO: "ESPN_ERROR"
            };
        }

        if (!isCBBView()) {
            return {
                ROVER_EVENT_ID: rover.roverEventId,
                FECHA: rover.date,
                ROVER_AWAY_COD: rover.away.roverCode,
                ROVER_AWAY: rover.away.roverName,
                ROVER_AWAY_ESPN_ID: awayMap.espn_id || "",
                ROVER_HOME_COD: rover.home.roverCode,
                ROVER_HOME: rover.home.roverName,
                ROVER_HOME_ESPN_ID: homeMap.espn_id || "",
                ESPN_EVENT_ID: "",
                ESPN_EVENT: "",
                ESPN_DATE: "",
                ESPN_DATE_ET: "",
                FUENTE: "",
                ESTADO: "CANCELLED_CONTEXT_CHANGED"
            };
        }

        let matched = matchRoverEvent(rover, day.index);

        if (matched.status === "NOT_FOUND" && scheduleFallback) {
            matched = await matchViaTeamSchedule(rover, { useCache });
        }

        return toResultRow(rover, matched);
    }

    async function resolveRoverAutoShared(
        rover,
        {
            useCache = true,
            scheduleFallback = true
        } = {}
    ) {
        const signature = roverLinkSignature(rover);

        if (!signature) {
            return resolveRoverAuto(rover, {
                useCache,
                scheduleFallback
            });
        }

        const key =
            `${signature}:${useCache ? "C" : "F"}:${scheduleFallback ? "S" : "N"}`;

        return singleFlight(
            autoLinkInFlight,
            key,
            () =>
                resolveRoverAuto(rover, {
                    useCache,
                    scheduleFallback
                })
        );
    }

    // ============================================================
    // MOD 15 - BUSQUEDA MANUAL DE CANDIDATOS ESPN
    // No hace fuzzy-match automatico. Solo presenta opciones al usuario.
    // ============================================================

    function eventTimeEt(value) {
        if (!value) {
            return "";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: "America/New_York",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }).format(date);
        } catch (_) {
            return "";
        }
    }

    function manualCandidateScore(event, awayId, homeId) {
        const away = String(awayId || "");
        const home = String(homeId || "");

        if (
            away && home &&
            event.awayEspnId === away &&
            event.homeEspnId === home
        ) {
            return 100;
        }

        if (
            away && home &&
            event.awayEspnId === home &&
            event.homeEspnId === away
        ) {
            return 90;
        }

        const ids = new Set([event.awayEspnId, event.homeEspnId]);
        let score = 0;
        if (away && ids.has(away)) score += 20;
        if (home && ids.has(home)) score += 20;
        return score;
    }

    async function getManualCandidates(rover, { useCache = true } = {}) {
        const awayMap = getTeamMap(rover?.away?.roverCode);
        const homeMap = getTeamMap(rover?.home?.roverCode);
        const collections = [];

        try {
            const day = await fetchAllScoreboards(rover.date, { useCache });
            collections.push(day.events);
        } catch (error) {
            console.warn(`${TAG} Busqueda manual: scoreboards no disponibles`, error);
        }

        const season = basketballSeasonYear(rover.date);
        const teamIds = [...new Set([
            awayMap?.espn_id,
            homeMap?.espn_id
        ].filter(Boolean).map(String))];

        for (const teamId of teamIds) {
            if (!isCBBView()) {
                break;
            }

            try {
                const schedule = await fetchTeamSchedule(teamId, season, { useCache });
                collections.push(schedule.events);
            } catch (error) {
                console.warn(`${TAG} Busqueda manual: schedule ${teamId} no disponible`, error);
            }
        }

        const merged = mergeEspnEvents(collections);
        const sameDate = merged.filter(event =>
            !event.easternDate || event.easternDate === rover.date
        );

        const awayId = awayMap?.espn_id || "";
        const homeId = homeMap?.espn_id || "";

        return sameDate
            .map(event => ({
                ...event,
                manualScore: manualCandidateScore(event, awayId, homeId)
            }))
            .sort((a, b) => {
                if (b.manualScore !== a.manualScore) {
                    return b.manualScore - a.manualScore;
                }

                const aTime = Date.parse(a.date || "") || 0;
                const bTime = Date.parse(b.date || "") || 0;
                if (aTime !== bTime) {
                    return aTime - bTime;
                }

                return a.name.localeCompare(b.name);
            });
    }

    // ============================================================
    // MOD 16 - ESPN GAME DATA READER (SOLO LECTURA)
    // No escribe ni cambia ningún input de Rover.
    // ============================================================

    function normalizeScoreValue(value) {
        if (value === null || value === undefined || value === "") {
            return "";
        }

        let raw = value;

        if (typeof raw === "object") {
            raw =
                raw.value ??
                raw.displayValue ??
                raw.score ??
                raw.total ??
                "";
        }

        if (raw === null || raw === undefined || raw === "") {
            return "";
        }

        const trimmed = typeof raw === "string" ? clean(raw) : raw;
        if (trimmed === "") return "";
        const numeric = Number(trimmed);

        if ((typeof trimmed === "number" || typeof trimmed === "string") &&
            Number.isInteger(numeric) && numeric >= 0) {
            return numeric;
        }

        return clean(trimmed);
    }

    function statusInfoFromCompetition(competition) {
        const status = competition?.status || {};
        const type = status?.type || {};

        const typeId = String(type.id ?? "");
        const state = clean(type.state || "");
        const completed = Boolean(type.completed);
        const name = clean(type.name || "");
        const description = clean(type.description || "");
        const detail = clean(type.detail || "");
        const shortDetail = clean(type.shortDetail || "");

        let normalized = "UNKNOWN";
        const labels = [name, description, detail, shortDetail].join(" ").replace(/_/g, " ");
        // ESPN puede marcar completed incluso en partidos cancelados.
        if (/\bCANCELED\b|\bCANCELLED\b|\bCANCEL\b/i.test(labels)) {
            normalized = "CANCELED";
        } else if (/\bPOSTPONED\b|\bPOSTPONE\b/i.test(labels)) {
            normalized = "POSTPONED";
        } else if (/\bSUSPENDED\b|\bSUSPEND\b/i.test(labels)) {
            normalized = "SUSPENDED";
        } else if (completed || /\bFINAL\b/i.test(labels)) {
            normalized = "FINAL";
        } else if (/\bDELAYED\b|\bDELAY\b/i.test(labels)) {
            normalized = "DELAYED";
        } else if (state === "in") {
            normalized = "LIVE";
        } else if (state === "pre") {
            normalized = "NOT_STARTED";
        }

        return {
            normalized,
            typeId,
            state,
            completed,
            name,
            description,
            detail,
            shortDetail,
            period: Number(status?.period || 0) || 0,
            clock: clean(
                status?.displayClock ??
                status?.clock?.displayValue ??
                status?.clock?.value ??
                status?.clock ??
                ""
            )
        };
    }

    function normalizeBasketballCompetitor(competitor, statusInfo) {
        const team = competitor?.team || {};
        const linescores = Array.isArray(competitor?.linescores) ? competitor.linescores : [];
        const periods = new Map();
        for (const [index, line] of linescores.entries()) {
            const period = Number(line?.period ?? line?.periodNumber ?? index + 1);
            if (!Number.isInteger(period) || period <= 0) continue;
            const value = normalizeScoreValue(line?.value ?? line?.displayValue ?? line?.score);
            periods.set(period, periods.has(period) && periods.get(period) !== value ? "" : value);
        }
        const h1 = periods.get(1) ?? "";
        const h2 = periods.get(2) ?? "";
        const otPeriods = [...periods.entries()]
            .filter(([period]) => period >= 3)
            .sort((a, b) => a[0] - b[0])
            .map(([period, value]) => ({ period, value }));
        const statusText = [statusInfo?.detail, statusInfo?.shortDetail, statusInfo?.description].join(" ");
        const declaredPeriod = Number(statusInfo?.period || 0);
        const declaredOt = declaredPeriod >= 3 || /\b(?:\d+)?OT\b|OVERTIME/i.test(statusText);
        let ot = "";
        if (otPeriods.length && otPeriods.every((item, i) =>
            item.period === i + 3 && isNumericScoreValue(item.value)) &&
            (!declaredPeriod || declaredPeriod <= otPeriods.length + 2)) {
            ot = otPeriods.reduce((sum, item) => sum + Number(item.value), 0);
        } else if (!otPeriods.length && !declaredOt && statusInfo?.normalized === "FINAL" &&
            isNumericScoreValue(h1) && isNumericScoreValue(h2)) {
            ot = 0;
        }
        return {
            homeAway: clean(competitor?.homeAway),
            teamId: String(team.id || competitor?.id || ""),
            name: clean(team.displayName || team.shortDisplayName || team.name || competitor?.displayName),
            abbreviation: clean(team.abbreviation),
            h1, h2, ot, otPeriods,
            final: normalizeScoreValue(competitor?.score ?? competitor?.displayScore ?? competitor?.total),
            linescoresRaw: linescores
        };
    }

    function getSummaryCompetition(data) {
        const competition =
            data?.header?.competitions?.[0] ||
            data?.competitions?.[0] ||
            null;

        if (!competition) {
            throw new Error("ESPN summary no contiene header.competitions[0]");
        }

        return competition;
    }

    async function fetchGameSummary(espnEventId, {
        useCache = true
    } = {}) {
        const id = String(espnEventId || "").trim();

        if (!/^\d+$/.test(id)) {
            throw new Error("ESPN Event ID inválido para summary");
        }

        const cacheKey = `summary:${id}`;

        if (useCache) {
            const item = gameSummaryCache.get(cacheKey);

            if (
                item &&
                Date.now() - item.fetchedAt <= GAME_SUMMARY_CACHE_TTL_MS
            ) {
                return item.value;
            }
        }

        /*
         * Incluso con useCache=false reutilizamos una petición que ya esté
         * EN CURSO para el mismo Event ID. Evita doble request por clicks
         * rápidos, sin reutilizar respuestas viejas.
         */
        const inFlight = gameSummaryInFlight.get(id);

        if (inFlight) {
            return inFlight;
        }

        const url =
            "https://site.api.espn.com/" +
            "apis/site/v2/sports/" +
            "basketball/mens-college-basketball/" +
            "summary" +
            `?event=${encodeURIComponent(id)}`;


        const request = espnGet(url)
            .then(data => {
                gameSummaryCache.set(cacheKey, {
                    fetchedAt: Date.now(),
                    value: data
                });

                return data;
            })
            .finally(() => {
                if (gameSummaryInFlight.get(id) === request) {
                    gameSummaryInFlight.delete(id);
                }
            });

        gameSummaryInFlight.set(id, request);
        return request;
    }


    async function getActiveEspnLink({
        useCache = true,
        preferActiveCache = true,
        forceResolve = false,
        roverSnapshot = null
    } = {}) {
        if (!isCBBView()) {
            return {
                ok: false,
                reason: "NOT_CBB"
            };
        }

        const rover = roverSnapshot?.valid
            ? roverSnapshot
            : await waitForCurrentRoverEvent(3000);

        if (!rover?.valid) {
            return {
                ok: false,
                reason: rover?.reason || "NO_ROVER_EVENT",
                rover
            };
        }

        const override = getOverride(rover.roverEventId);

        if (override?.mode === "disabled") {
            return {
                ok: false,
                reason: "AUTO_DISABLED",
                rover,
                mode: "DISABLED",
                override
            };
        }

        /*
         * MANUAL siempre es fast-path: el Event ID ya está persistido.
         * No necesita scoreboard ni schedule.
         */
        if (override?.mode === "manual") {
            const eventId = String(override.espnEventId || "").trim();

            if (!/^\d+$/.test(eventId)) {
                return {
                    ok: false,
                    reason: "MANUAL_EVENT_ID_INVALID",
                    rover,
                    mode: "MANUAL",
                    override
                };
            }

            return {
                ok: true,
                rover,
                mode: "MANUAL",
                espnEventId: eventId,
                source: clean(override.source || "MANUAL"),
                pairOrder: "UNKNOWN",
                override,
                fastPath: true
            };
        }

        /*
         * AUTO fast-path:
         * Si la firma Rover (event/date/away/home) sigue idéntica, el
         * ESPN Event ID ya fue validado durante el render inicial.
         */
        if (preferActiveCache && !forceResolve) {
            const cached = getActiveAutoLink(rover);

            if (cached) {

                return {
                    ok: true,
                    rover,
                    mode: "AUTO",
                    espnEventId: cached.espnEventId,
                    source: cached.source,
                    pairOrder: cached.pairOrder,
                    cachedLink: cached,
                    fastPath: true
                };
            }
        }

        /*
         * Fallback seguro: solo ocurre si todavía no existe vínculo en
         * memoria, cambió la firma Rover o se pidió forceResolve.
         */

        const result = await resolveRoverAutoShared(
            rover,
            {
                useCache,
                scheduleFallback: true
            }
        );

        const eventId = String(result?.ESPN_EVENT_ID || "").trim();

        if (
            !/^\d+$/.test(eventId) ||
            !acceptedAutoLinkStatus(result?.ESTADO)
        ) {
            invalidateActiveLink(rover.roverEventId);

            return {
                ok: false,
                reason: result?.ESTADO || "AUTO_NOT_LINKED",
                rover,
                mode: "AUTO",
                result
            };
        }

        const cached = setActiveAutoLink(rover, result);

        return {
            ok: true,
            rover,
            mode: "AUTO",
            espnEventId: eventId,
            source: clean(result?.FUENTE || result?.ESTADO || "AUTO"),
            pairOrder: cached?.pairOrder || "UNKNOWN",
            result,
            fastPath: false
        };
    }


    function normalizeGameSummary(data, link) {
        const competition = getSummaryCompetition(data);
        const status = statusInfoFromCompetition(competition);
        const competitors = Array.isArray(competition?.competitors)
            ? competition.competitors
            : [];

        const awayRaw = competitors.find(item => item?.homeAway === "away");
        const homeRaw = competitors.find(item => item?.homeAway === "home");

        if (!awayRaw || !homeRaw) {
            throw new Error(
                "ESPN summary no contiene competidores AWAY/HOME identificables"
            );
        }

        const away = normalizeBasketballCompetitor(awayRaw, status);
        const home = normalizeBasketballCompetitor(homeRaw, status);

        const roverAwayMap = getTeamMap(link?.rover?.away?.roverCode);
        const roverHomeMap = getTeamMap(link?.rover?.home?.roverCode);

        const expectedAwayId = String(roverAwayMap?.espn_id || "");
        const expectedHomeId = String(roverHomeMap?.espn_id || "");

        const exactPair = Boolean(
            expectedAwayId &&
            expectedHomeId &&
            away.teamId === expectedAwayId &&
            home.teamId === expectedHomeId
        );

        const reversedPair = Boolean(
            expectedAwayId &&
            expectedHomeId &&
            away.teamId === expectedHomeId &&
            home.teamId === expectedAwayId
        );

        const pairOrder = exactPair
            ? "EXACT"
            : reversedPair
                ? "REVERSED"
                : "MISMATCH";

        /*
         * Un par invertido sigue siendo el MISMO juego: son exactamente
         * los mismos dos Team IDs, solo ESPN y Rover difieren en HOME/AWAY.
         */
        const pairMatchesRover = exactPair || reversedPair;

        const eventDate =
            competition?.date ||
            data?.header?.competitions?.[0]?.date ||
            "";

        const normalized = {
            roverEventId: String(link?.rover?.roverEventId || ""),
            roverDate: clean(link?.rover?.date || ""),
            espnEventId: String(link?.espnEventId || ""),
            linkMode: clean(link?.mode || ""),
            linkSource: clean(link?.source || ""),
            pairMatchesRover,
            pairOrder,
            reversedPair,
            expected: {
                awayEspnId: expectedAwayId,
                awayRoverCode: String(link?.rover?.away?.roverCode || ""),
                awayRover: clean(link?.rover?.away?.roverName || ""),
                homeEspnId: expectedHomeId,
                homeRoverCode: String(link?.rover?.home?.roverCode || ""),
                homeRover: clean(link?.rover?.home?.roverName || "")
            },
            event: {
                name: clean(
                    competition?.name ||
                    competition?.shortName ||
                    data?.header?.shortName ||
                    data?.header?.name ||
                    `${away.name} @ ${home.name}`
                ),
                date: eventDate,
                easternDate: easternDateFromEspnDate(eventDate)
            },
            status,
            away,
            home
        };

        return normalized;
    }

    function gameConsoleRows(game) {
        return [game.away, game.home].map(team => ({
            TEAM_ID: team.teamId, TEAM: team.name,
            H1: team.h1, H2: team.h2, OT: team.ot, F: team.final
        }));
    }

    async function readGame({
        useCache = true,
        quiet = false,
        roverSnapshot = null
    } = {}) {
        if (!quiet) {
            console.log(`ESPN CBB GAME DATA READER v${VERSION}`);
        }

        const link = await getActiveEspnLink({
            useCache,
            roverSnapshot
        });

        if (!link?.ok) {
            console.error(
                `${TAG} No hay un vínculo ESPN utilizable para leer el juego:`,
                link
            );
            return null;
        }

        if (!quiet) console.log(
            `${TAG} Link ${link.mode}: Rover #${link.rover.roverEventId} -> ESPN #${link.espnEventId}`
        );

        let data;

        try {
            data = await fetchGameSummary(
                link.espnEventId,
                { useCache }
            );
        } catch (error) {
            console.error(`${TAG} Error leyendo ESPN GAME SUMMARY:`, error);
            return null;
        }

        if (!isCBBView()) {
            console.warn(
                `${TAG} La vista dejó de ser BASKETBALL > CBB. Respuesta descartada.`
            );
            return null;
        }

        const current = getCurrentRoverEvent();

        if (
            !current?.valid ||
            current.roverEventId !== link.rover.roverEventId
        ) {
            console.warn(
                `${TAG} Cambió el evento Rover mientras se consultaba ESPN. Respuesta descartada.`
            );
            return null;
        }

        let game;

        try {
            game = normalizeGameSummary(data, link);
        } catch (error) {
            console.error(`${TAG} No pude normalizar GAME SUMMARY:`, error);
            console.log(`${TAG} Payload crudo disponible en __ESPN_CBB_LAST_GAME_RAW`);
            expose("__ESPN_CBB_LAST_GAME_RAW", data);
            return null;
        }

        expose("__ESPN_CBB_LAST_GAME_RAW", data);
        expose("__ESPN_CBB_LAST_GAME", game);

        if (!quiet) {
        console.log("=== VÍNCULO / ESTADO ===");
        console.table([{
            ROVER_EVENT_ID: game.roverEventId,
            ESPN_EVENT_ID: game.espnEventId,
            LINK_MODE: game.linkMode,
            LINK_SOURCE: game.linkSource,
            PAIR_MATCHES_ROVER: game.pairMatchesRover ? "SI" : "NO",
            PAIR_ORDER: game.pairOrder,
            ESTADO: game.status.normalized,
            STATE: game.status.state,
            PERIOD: game.status.period,
            CLOCK: game.status.clock,
            DETAIL: game.status.detail || game.status.shortDetail || game.status.description,
            ESPN_DATE: game.event.date,
            ESPN_DATE_ET: game.event.easternDate
        }]);

        console.log("=== PARCIALES ESPN ===");
        console.table(gameConsoleRows(game));

        if (!game.pairMatchesRover) {
            console.warn(
                `${TAG} ⚠️ El ESPN Event ID activo NO contiene el mismo par de Team IDs esperado por Rover.`
            );
        } else if (game.pairOrder === "REVERSED") {
            console.warn(
                `${TAG} ℹ️ Orden invertido: Rover y ESPN tienen HOME/AWAY opuestos. ` +
                `Los resultados se remapearán por Team ID antes de escribir T1/T2.`
            );
        }

        console.log(
            `${TAG} SOLO LECTURA: no se modificó ningún campo de Rover.`
        );
        }

        return game;
    }

    async function readGameFresh({
        quiet = false,
        roverSnapshot = null
    } = {}) {
        return readGame({
            useCache: false,
            quiet,
            roverSnapshot
        });
    }









    async function diagHalftime() {
        const game = await readGameFresh({ quiet: true });
        if (!game) return null;
        const detection = halftimeDetectionDetails(game);
        console.table(gameConsoleRows(game));
        console.table([detection]);
        return { game, detection, mapping: "H1 → Q2; H2 → Q4; Q1/Q3 vacíos" };
    }

    // ============================================================
    // MOD 17 - ROVER RESULT WRITER
    // Solo llena campos del formulario. NO pulsa Guardar Resultados
    // ni Procesar Tickets.
    // ============================================================

    function dispatchRoverFieldEvents(element) {
        if (!element) {
            return;
        }

        element.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        element.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );
    }

    function setRoverFieldValue(element, value) {
        if (!element || value === "" || value === null || value === undefined) {
            return {
                changed: false,
                skipped: true
            };
        }

        const next = String(value);
        const previous = String(element.value ?? "");

        if (previous === next) {
            return {
                changed: false,
                skipped: false,
                previous,
                next
            };
        }

        element.value = next;
        dispatchRoverFieldEvents(element);

        return {
            changed: true,
            skipped: false,
            previous,
            next
        };
    }

    function isNumericScoreValue(value) {
        if (typeof value === "number") return Number.isInteger(value) && value >= 0;
        return typeof value === "string" && /^\d+$/.test(clean(value));
    }

    function firstHalfTotal(team) {
        return isNumericScoreValue(team?.h1) ? Number(team.h1) : "";
    }

    function validateFirstHalfBreakdown(team, label) {
        const missing = isNumericScoreValue(team?.h1) ? [] : [`${label}.h1`];
        return { ok: !missing.length, missing, inconsistencies: [] };
    }

    function validateTeamScorePhase(team, phase, label) {
        const required = phase === "HALFTIME" ? ["h1", "final"] : ["h1", "h2", "ot", "final"];
        const missing = required.filter(field => !isNumericScoreValue(team?.[field]))
            .map(field => `${label}.${field}`);
        const inconsistencies = [];
        if (!missing.length) {
            const calculated = phase === "HALFTIME" ? Number(team.h1)
                : Number(team.h1) + Number(team.h2) + Number(team.ot);
            if (calculated !== Number(team.final)) {
                inconsistencies.push(`${label}: parciales=${calculated} pero F=${team.final}`);
            }
        }
        return { ok: !missing.length && !inconsistencies.length, missing, inconsistencies };
    }

    function validateWritableGamePhase(game, phase) {
        const ordered = getRoverOrderedScoreTeams(game);

        if (!ordered) {
            return {
                ok: false,
                reason: "TEAM_ID_MAPPING_FAILED",
                missing: [],
                inconsistencies: [
                    "No se pudo mapear ESPN Team ID -> Rover T1/T2"
                ]
            };
        }

        const catchUp = phase === "HALFTIME_CATCHUP";

        const t1 = catchUp
            ? validateFirstHalfBreakdown(
                ordered.roverAway,
                "T1/AWAY"
            )
            : validateTeamScorePhase(
                ordered.roverAway,
                phase,
                "T1/AWAY"
            );

        const t2 = catchUp
            ? validateFirstHalfBreakdown(
                ordered.roverHome,
                "T2/HOME"
            )
            : validateTeamScorePhase(
                ordered.roverHome,
                phase,
                "T2/HOME"            );

        const missing = [
            ...t1.missing,
            ...t2.missing
        ];

        const inconsistencies = [
            ...t1.inconsistencies,
            ...t2.inconsistencies
        ];

        return {
            ok: !missing.length && !inconsistencies.length,
            reason:
                missing.length
                    ? "INCOMPLETE_ESPN_SCORE"
                    : inconsistencies.length
                        ? "INCONSISTENT_ESPN_SCORE"
                        : "OK",
            missing,
            inconsistencies,
            ordered
        };
    }

    const FOX_HOST = "https://api.foxsports.com";
    const FOX_API_KEY = "jE7yBJVRNAwdDesMgTzTXUUSx1It41Fq";
    const FOX_CACHE_TTL_MS = 15000;
    const foxGameLogs = new Map();
    const foxSchedules = new Map();
    const foxEvents = new Map();
    const foxLinks = new Map();

    const foxGameLogInFlight = new Map();
    const foxScheduleInFlight = new Map();
    const foxEventInFlight = new Map();
    const foxLinkInFlight = new Map();

    let lastUpdateTiming = null;
    let sourceNoticeRequestSeq = 0;

    function singleFlight(map, key, producer) {
        const pending = map.get(key);
        if (pending) {
            return pending;
        }

        const request = Promise.resolve()
            .then(producer)
            .finally(() => {
                if (map.get(key) === request) {
                    map.delete(key);
                }
            });

        map.set(key, request);
        return request;
    }

    function publishUpdateTiming(timing, reason) {
        const snapshot = {
            ...timing,
            reason,
            totalMs: Math.round(performance.now() - timing.startedAt),
            recordedAt: new Date().toISOString()
        };

        delete snapshot.startedAt;
        lastUpdateTiming = Object.freeze(snapshot);
        expose("__CBB_FOX_LAST_TIMING", lastUpdateTiming);
        return lastUpdateTiming;
    }

    function diagPerformance() {
        if (!lastUpdateTiming) {
            console.log(`${TAG} Todavía no hay medición de Actualizar.`);
            return null;
        }

        console.table([lastUpdateTiming]);
        return lastUpdateTiming;
    }

    function foxUrl(path) {
        const url = new URL(path, FOX_HOST);
        url.searchParams.set("api-version", "1.1");
        url.searchParams.set("apikey", FOX_API_KEY);
        return url.href;
    }

    function foxGet(url) {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" || parsed.hostname !== "api.foxsports.com") {
            return Promise.reject(new Error("Host FOX no permitido"));
        }

        const options = {
            method: "GET",
            url: parsed.href,
            headers: { Accept: "application/json" },
            timeout: 15000
        };

        const parse = response => {
            if (response.status < 200 || response.status >= 300) {
                throw new Error(`FOX HTTP ${response.status}`);
            }
            try {
                return JSON.parse(response.responseText);
            } catch (_) {
                throw new Error("FOX devolvió JSON inválido");
            }
        };

        if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") {
            return GM.xmlHttpRequest(options).then(parse);
        }

        if (typeof GM_xmlhttpRequest === "function") {
            return new Promise((resolve, reject) => GM_xmlhttpRequest({
                ...options,
                onload: response => {
                    try { resolve(parse(response)); } catch (error) { reject(error); }
                },
                onerror: reject,
                ontimeout: () => reject(new Error("FOX timeout"))
            }));
        }

        return Promise.reject(new Error("Tampermonkey no expuso HTTP para FOX"));
    }

    async function fetchFoxTeamGamelog(teamId, { useCache = true } = {}) {
        const id = String(teamId || "");
        if (!/^\d+$/.test(id)) {
            throw new Error("FOX Team ID inválido");
        }

        const cached = foxGameLogs.get(id);
        if (useCache && cached && Date.now() - cached.at < 5 * 60 * 1000) {
            return cached.data;
        }

        return singleFlight(foxGameLogInFlight, id, async () => {
            const data = await foxGet(foxUrl(`/bifrost/v1/cbk/team/${id}/gamelog`));
            foxGameLogs.set(id, { at: Date.now(), data });
            return data;
        });
    }

    async function fetchFoxTeamScheduleMain(teamId, { useCache = true } = {}) {
        const id = String(teamId || "");
        if (!/^\d+$/.test(id)) {
            throw new Error("FOX Team ID inválido");
        }

        const key = `main:${id}`;
        const cached = foxSchedules.get(key);
        if (useCache && cached && Date.now() - cached.at < 5 * 60 * 1000) {
            return cached.data;
        }

        return singleFlight(foxScheduleInFlight, key, async () => {
            const data = await foxGet(
                foxUrl(`/bifrost/v1/cbk/team/${id}/schedule-main`)
            );
            foxSchedules.set(key, { at: Date.now(), data });
            return data;
        });
    }

    async function fetchFoxTeamScheduleSegment(teamId, segmentId, { useCache = true } = {}) {
        const id = String(teamId || "");
        const segment = String(segmentId || "");

        if (!/^\d+$/.test(id) || !/^\d{4}-\d+$/.test(segment)) {
            throw new Error("Segmento FOX inválido");
        }

        const key = `segment:${id}:${segment}`;
        const cached = foxSchedules.get(key);
        if (useCache && cached && Date.now() - cached.at < 60 * 1000) {
            return cached.data;
        }

        return singleFlight(foxScheduleInFlight, key, async () => {
            const data = await foxGet(
                foxUrl(`/bifrost/v1/cbk/team/${id}/schedule-segment/${segment}`)
            );
            foxSchedules.set(key, { at: Date.now(), data });
            return data;
        });
    }


    function foxSeasonFromDate(date) {
        const match = String(date || "").match(/^(\d{4})-(\d{2})-/);
        if (!match) return "";
        const year = Number(match[1]);
        return String(Number(match[2]) >= 7 ? year : year - 1);
    }

    function basketballSeasonYear(date) {
        const match = String(date || "").match(/^(\d{4})-(\d{2})-/);
        if (!match) return "";
        return String(Number(match[1]) + (Number(match[2]) >= 7 ? 1 : 0));
    }

    async function findFoxEventFromTeamSchedule(teamId, awayId, homeId, date) {
        const season = foxSeasonFromDate(date);
        if (!season) return [];

        let selectionIds = [];

        try {
            const main = await fetchFoxTeamScheduleMain(teamId);
            selectionIds = (main?.selectionGroupList || [])
                .flatMap(group => group?.selectionList || [])
                .map(item => String(item?.id || ""))
                .filter(id => id.startsWith(`${season}-`));
        } catch (error) {
            console.warn(`${TAG} FOX schedule-main ${teamId}:`, error);
        }

        if (!selectionIds.length) {
            selectionIds = [`${season}-1`];
        }

        const matches = new Map();

        for (const segmentId of selectionIds) {
            try {
                const segment = await fetchFoxTeamScheduleSegment(teamId, segmentId);
                findFoxScheduleMatches(segment, awayId, homeId, date, matches);
                if (matches.size) break;
            } catch (error) {
                console.warn(`${TAG} FOX schedule ${teamId}/${segmentId}:`, error);
            }
        }

        return [...matches.values()];
    }

    async function getFoxScheduleEventIds(teamId, date) {
        const season = foxSeasonFromDate(date);
        if (!season) return [];

        const ids = new Set();
        let selectionIds = [];

        try {
            const main = await fetchFoxTeamScheduleMain(teamId);
            selectionIds = (main?.selectionGroupList || [])
                .flatMap(group => group?.selectionList || [])
                .map(item => String(item?.id || ""))
                .filter(id => id.startsWith(`${season}-`));
        } catch (error) {
            console.warn(`${TAG} FOX schedule-main ${teamId}:`, error);
        }

        if (!selectionIds.length) {
            selectionIds = [`${season}-1`];
        }

        for (const segmentId of selectionIds) {
            try {
                const segment = await fetchFoxTeamScheduleSegment(teamId, segmentId);
                collectFoxEventIds(segment, ids);
            } catch (error) {
                console.warn(`${TAG} FOX schedule ${teamId}/${segmentId}:`, error);
            }
        }

        return [...ids];
    }

    async function fetchFoxEvent(eventId, { useCache = true } = {}) {
        const id = String(eventId || "");
        if (!/^\d+$/.test(id)) {
            throw new Error("FOX Event ID inválido");
        }

        const cached = foxEvents.get(id);
        if (useCache && cached && Date.now() - cached.at < FOX_CACHE_TTL_MS) {
            return cached.data;
        }

        return singleFlight(foxEventInFlight, id, async () => {
            const data = await foxGet(foxUrl(`/bifrost/v1/cbk/event/${id}/data`));
            foxEvents.set(id, { at: Date.now(), data });
            return data;
        });
    }


    function collectFoxEventIds(value, out = new Set()) {
        if (!value || typeof value !== "object") return out;

        if (Array.isArray(value)) {
            for (const item of value) collectFoxEventIds(item, out);
            return out;
        }

        for (const [key, item] of Object.entries(value)) {
            if (typeof item === "string") {
                const direct = item.match(/basketball\/cbk\/events\/(\d+)/i);
                if (direct) out.add(direct[1]);

                const box = item.match(/game-boxscore-(\d+)/i);
                if (box) out.add(box[1]);

                if ((key === "id" || key === "eventId") && /^\d+$/.test(item)) {
                    // Do not add generic numeric ids; only event-shaped paths above are trusted.
                }
            } else if (item && typeof item === "object") {
                collectFoxEventIds(item, out);
            }
        }

        return out;
    }

    function findFoxScheduleMatches(value, awayId, homeId, date, out = new Map()) {
        if (!value || typeof value !== "object") return out;

        if (Array.isArray(value)) {
            for (const item of value) {
                findFoxScheduleMatches(item, awayId, homeId, date, out);
            }
            return out;
        }

        const entityLink = value.entityLink;
        const tokens = entityLink?.layout?.tokens;

        if (entityLink && tokens) {
            const eventId = String(
                tokens.id ||
                String(tokens.eventUri || "").match(/basketball\/cbk\/events\/(\d+)/i)?.[1] ||
                ""
            );

            const tokenHome = foxTeamIdFromUri(tokens.homeUri);
            const tokenAway = foxTeamIdFromUri(tokens.awayUri);
            const pairMatches =
                eventId &&
                [tokenAway, tokenHome].includes(String(awayId)) &&
                [tokenAway, tokenHome].includes(String(homeId)) &&
                tokenAway !== tokenHome;

            if (pairMatches) {
                const webUrl = clean(entityLink.webUrl);
                let urlDate = "";

                const m = webUrl.match(/-([a-z]{3})-(\d{2})-(\d{4})-game-boxscore-/i);
                if (m) {
                    const months = {
                        jan:"01", feb:"02", mar:"03", apr:"04",
                        may:"05", jun:"06", jul:"07", aug:"08",
                        sep:"09", oct:"10", nov:"11", dec:"12"
                    };
                    const month = months[m[1].toLowerCase()];
                    if (month) urlDate = `${m[3]}-${month}-${m[2]}`;
                }

                if (!date || !urlDate || urlDate === date) {
                    out.set(eventId, {
                        eventId,
                        homeId: tokenHome,
                        awayId: tokenAway,
                        date: urlDate,
                        webUrl
                    });
                }
            }
        }

        for (const item of Object.values(value)) {
            if (item && typeof item === "object") {
                findFoxScheduleMatches(item, awayId, homeId, date, out);
            }
        }

        return out;
    }

    function foxTeamIdFromUri(value) {
        const match = String(value || "").match(/basketball\/cbk\/teams\/(\d+)/i);
        return match ? match[1] : "";
    }

    function foxHeader(data) {
        return data?.header && typeof data.header === "object"
            ? data.header
            : null;
    }

    function foxEventDate(data) {
        const header = foxHeader(data);
        const eventTime = clean(header?.eventTime);
        if (eventTime) {
            const date = easternDateFromEspnDate(eventTime);
            if (date) return date;
        }

        const analytics = clean(header?.analyticsDescription);
        const match = analytics.match(/(\d{4})(\d{2})(\d{2})$/);
        return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
    }

    function normalizeFoxStatus(data) {
        const header = foxHeader(data);
        const raw = upper(header?.statusLine);
        const eventStatus = Number(header?.eventStatus);
        const half = raw.match(/\b([12])(?:ST|ND)\b|\b([12])\s*(?:HALF|H)\b/);
        const extra = raw.match(/\b(\d+)?OT\b/);
        const period = extra ? 2 + Number(extra[1] || 1)
            : half ? Number(half[1] || half[2]) : Number(header?.period || 0);
        const clock = [raw, clean(header?.statusLine2)].join(" ").match(/\b\d{1,2}:\d{2}\b/)?.[0] || "";
        for (const [pattern, normalized] of [
            [/\bCANCEL/, "CANCELED"], [/\bPOSTPON/, "POSTPONED"], [/\bSUSPEND/, "SUSPENDED"]
        ]) {
            if (pattern.test(raw)) return { normalized, raw, period, clock };
        }
        if (/\bDELAY/.test(raw)) return { normalized: "DELAYED", raw, period, clock };
        if (/^FINAL(?:\s*\/.*)?$/.test(raw) || eventStatus === 3) {
            return { normalized: "FINAL", raw, period: extra ? period : 2, clock: "" };
        }
        if (/\bHALF[ -]?TIME\b/.test(raw) || /^(?:HALF|HT)$/.test(raw)) {
            return { normalized: "HALFTIME", raw, period: 1, clock: "" };
        }
        if (period || eventStatus === 1) return { normalized: "LIVE", raw, period, clock };
        return { normalized: "NOT_STARTED", raw, period: 0, clock: "" };
    }

    function parseFoxLinescore(data) {
        const section = data?.linescore;
        const columns = Array.isArray(section?.headers?.[0]?.columns)
            ? section.headers[0].columns : Array.isArray(section?.headers) ? section.headers : [];
        const headers = new Map(columns.map(column => [Number(column?.index), upper(column?.text)]));
        return (Array.isArray(section?.rows) ? section.rows : []).map(row => {
            const cells = new Map((row?.columns || []).map(c => [Number(c.index), clean(c.text)]));
            const result = { label: cells.get(0) || clean(row?.title), h1: null, h2: null,
                ot: 0, otPeriods: [], final: null };
            let missingOt = false;
            for (const [index, label] of headers) {
                const value = cells.get(index);
                const otMatch = label.match(/^(?:(\d+))?OT(?:([1-9]\d*))?$/);
                if (otMatch && !isNumericScoreValue(value)) missingOt = true;
                if (!isNumericScoreValue(value)) continue;
                const number = Number(value);
                if (["1", "1H", "H1"].includes(label)) result.h1 = number;
                else if (["2", "2H", "H2"].includes(label)) result.h2 = number;
                else if (["T", "F", "TOTAL"].includes(label)) result.final = number;
                else if (otMatch) {
                    result.otPeriods.push({ period: 2 + Number(otMatch[1] || otMatch[2] || 1), label, value: number });
                    result.ot += number;
                }
            }
            result.otPeriods.sort((a, b) => a.period - b.period);
            const status = normalizeFoxStatus(data);
            if (missingOt || (status.period >= 3 && !result.otPeriods.length)) result.ot = null;
            return result;
        });
    }

    function normalizeFoxEvent(data) {
        const header = foxHeader(data);
        if (!header) return null;

        const left = header.leftTeam || {};
        const right = header.rightTeam || {};
        const leftId = foxTeamIdFromUri(left.uri || left.contentUri);
        const rightId = foxTeamIdFromUri(right.uri || right.contentUri);
        const scoreRows = parseFoxLinescore(data);

        const enrich = (team, id, row) => ({
            foxTeamId: id,
            name: clean(team?.imageAltText || team?.stackedNameTop || team?.longName || team?.name),
            nameShort: clean(team?.longName || team?.name),
            h1: row?.h1 ?? null,
            h2: row?.h2 ?? null,
            ot: row ? row.ot : null,
            otPeriods: row?.otPeriods || [],
            final: row?.final ?? null
        });

        return {
            foxEventId: String(header.id || ""),
            date: foxEventDate(data),
            status: normalizeFoxStatus(data),
            left: enrich(left, leftId, scoreRows[0]),
            right: enrich(right, rightId, scoreRows[1]),
            raw: data
        };
    }

    function buildFoxContext({ roverEventId, roverDate, awayRoverCode, homeRoverCode } = {}) {
        const away = getTeamMap(awayRoverCode);
        const home = getTeamMap(homeRoverCode);
        const ids = {
            away: String(away?.fox_id || ""),
            home: String(home?.fox_id || "")
        };

        if (!/^\d+$/.test(ids.away) || !/^\d+$/.test(ids.home) || ids.away === ids.home) {
            return { ok: false, reason: "FOX_MAPPING_MISSING", ids };
        }

        const date = clean(roverDate);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return { ok: false, reason: "FOX_DATE_MISSING", ids };
        }

        return {
            ok: true,
            roverEventId: String(roverEventId || ""),
            date,
            ids,
            signature: `${date}:${ids.away}:${ids.home}`
        };
    }

    function foxContextFromGame(game) {
        return buildFoxContext({
            roverEventId: game?.roverEventId,
            roverDate: game?.roverDate,
            awayRoverCode: game?.expected?.awayRoverCode,
            homeRoverCode: game?.expected?.homeRoverCode
        });
    }

    function foxContextFromRover(rover) {
        return buildFoxContext({
            roverEventId: rover?.roverEventId,
            roverDate: rover?.date,
            awayRoverCode: rover?.away?.roverCode,
            homeRoverCode: rover?.home?.roverCode
        });
    }

    function getCachedFoxLinkForContext(context) {
        if (!context?.ok || !context.roverEventId) {
            return null;
        }

        const cached = foxLinks.get(context.roverEventId);
        if (
            !cached ||
            cached.signature !== context.signature ||
            !/^\d+$/.test(String(cached.id || ""))
        ) {
            return null;
        }

        return {
            ok: true,
            ids: context.ids,
            date: context.date,
            signature: context.signature,
            eventId: String(cached.id),
            resolution: "FOX_LINK_VERIFIED_CACHE"
        };
    }

    function getCachedFoxLinkForRover(rover) {
        return getCachedFoxLinkForContext(
            foxContextFromRover(rover)
        );
    }

    async function verifyFoxLinkCandidate(
        context,
        eventId,
        resolution
    ) {
        const id = String(eventId || "");

        if (!/^\d+$/.test(id)) {
            return null;
        }

        try {
            const data = await fetchFoxEvent(
                id,
                { useCache: true }
            );

            const verified =
                normalizeAndValidateFoxEvent(
                    data,
                    context,
                    `FOX_LINK_VERIFIED_${resolution}`
                );

            if (!verified.ok) {
                return null;
            }

            foxLinks.set(
                context.roverEventId,
                {
                    signature:
                        context.signature,
                    id
                }
            );

            return {
                ok: true,
                ids: context.ids,
                date: context.date,
                signature:
                    context.signature,
                eventId: id,
                resolution:
                    `FOX_LINK_VERIFIED_${resolution}`
            };
        } catch (error) {
            console.warn(
                `${TAG} FOX candidate #${id} no se pudo verificar:`,
                error
            );
            return null;
        }
    }

    async function resolveFoxLinkContext(context) {
        if (!context?.ok) {
            return context || {
                ok: false,
                reason: "FOX_CONTEXT_INVALID"
            };
        }

        const cached = getCachedFoxLinkForContext(context);
        if (cached) {
            return cached;
        }

        const key = context.signature;

        return singleFlight(foxLinkInFlight, key, async () => {
            const secondCacheCheck =
                getCachedFoxLinkForContext(context);
            if (secondCacheCheck) {
                return secondCacheCheck;
            }

            let scheduleMatches = [];

            for (const teamId of [
                context.ids.away,
                context.ids.home
            ]) {
                try {
                    scheduleMatches =
                        await findFoxEventFromTeamSchedule(
                            teamId,
                            context.ids.away,
                            context.ids.home,
                            context.date
                        );
                } catch (error) {
                    console.warn(
                        `${TAG} FOX schedule ${teamId} no disponible:`,
                        error
                    );
                }

                if (scheduleMatches.length) {
                    break;
                }
            }

            if (scheduleMatches.length > 1) {
                return {
                    ok: false,
                    reason: "FOX_GAME_AMBIGUOUS",
                    ids: context.ids,
                    candidates:
                        scheduleMatches.map(item => item.eventId)
                };
            }

            if (scheduleMatches.length === 1) {
                const eventId = String(
                    scheduleMatches[0].eventId || ""
                );

                const verified =
                    await verifyFoxLinkCandidate(
                        context,
                        eventId,
                        "SCHEDULE_PAIR"
                    );

                if (verified) {
                    return verified;
                }
            }

            const candidateEventIds = new Set();

            for (const teamId of [
                context.ids.away,
                context.ids.home
            ]) {
                try {
                    const gamelog =
                        await fetchFoxTeamGamelog(teamId);

                    collectFoxEventIds(
                        gamelog,
                        candidateEventIds
                    );
                } catch (error) {
                    console.warn(
                        `${TAG} FOX gamelog ${teamId} no disponible:`,
                        error
                    );
                }

                if (candidateEventIds.size) {
                    break;
                }
            }

            if (!candidateEventIds.size) {
                return {
                    ok: false,
                    reason: "FOX_GAME_NOT_FOUND",
                    ids: context.ids
                };
            }

            const found = [];

            for (const eventId of candidateEventIds) {
                try {
                    const data = await fetchFoxEvent(
                        eventId,
                        { useCache: true }
                    );
                    const normalized =
                        normalizeFoxEvent(data);

                    if (
                        !normalized ||
                        normalized.date !== context.date
                    ) {
                        continue;
                    }

                    const actual = [
                        normalized.left?.foxTeamId,
                        normalized.right?.foxTeamId
                    ];

                    if (
                        actual.includes(context.ids.away) &&
                        actual.includes(context.ids.home)
                    ) {
                        found.push(normalized);
                    }
                } catch (error) {
                    console.warn(
                        `${TAG} FOX event #${eventId} no disponible:`,
                        error
                    );
                }
            }

            if (found.length !== 1) {
                return {
                    ok: false,
                    reason:
                        found.length > 1
                            ? "FOX_GAME_AMBIGUOUS"
                            : "FOX_GAME_NOT_FOUND",
                    ids: context.ids,
                    candidates: [...candidateEventIds]
                };
            }

            const match = found[0];

            foxLinks.set(context.roverEventId, {
                signature: context.signature,
                id: match.foxEventId
            });

            return {
                ok: true,
                ids: context.ids,
                date: context.date,
                signature: context.signature,
                eventId: match.foxEventId,
                resolution:
                    "FOX_LINK_VERIFIED_GAMELOG_PAIR"
            };
        });
    }

    function normalizeAndValidateFoxEvent(
        data,
        context,
        resolution = ""
    ) {
        const normalized = normalizeFoxEvent(data);
        const actual = [
            normalized?.left?.foxTeamId,
            normalized?.right?.foxTeamId
        ];

        if (
            !normalized ||
            normalized.date !== context.date ||
            !actual.includes(context.ids.away) ||
            !actual.includes(context.ids.home)
        ) {
            if (context.roverEventId) {
                foxLinks.delete(context.roverEventId);
            }

            return {
                ok: false,
                reason: "FOX_PAIR_OR_DATE_MISMATCH",
                ids: context.ids
            };
        }

        return {
            ok: true,
            ids: context.ids,
            foxEvent: normalized,
            resolution
        };
    }

    async function fetchFoxGameFromCachedLink(
        rover,
        { useCache = false } = {}
    ) {
        const context = foxContextFromRover(rover);
        if (!context.ok) {
            return context;
        }

        const link = getCachedFoxLinkForContext(context);
        if (!link) {
            return {
                ok: false,
                reason: "FOX_LINK_NOT_WARM",
                ids: context.ids
            };
        }

        const data = await fetchFoxEvent(
            link.eventId,
            { useCache }
        );

        return normalizeAndValidateFoxEvent(
            data,
            context,
            link.resolution
        );
    }

    async function warmFoxLink(rover) {
        const context = foxContextFromRover(rover);
        if (!context.ok) {
            return context;
        }

        try {
            return await resolveFoxLinkContext(context);
        } catch (error) {
            return {
                ok: false,
                reason: "FOX_LINK_WARM_FAILED",
                error,
                ids: context.ids
            };
        }
    }

    async function resolveFoxGame(
        game,
        { useEventCache = true } = {}
    ) {
        const context = foxContextFromGame(game);
        if (!context.ok) {
            return context;
        }

        const link = await resolveFoxLinkContext(context);
        if (!link.ok) {
            return link;
        }

        const data = await fetchFoxEvent(
            link.eventId,
            { useCache: useEventCache }
        );

        return normalizeAndValidateFoxEvent(
            data,
            context,
            link.resolution
        );
    }


    function getFoxOrderedTeams(foxLink) {
        if (!foxLink?.ok || !foxLink.foxEvent) return null;
        const event = foxLink.foxEvent;
        const away = [event.left, event.right].find(team =>
            String(team?.foxTeamId || "") === String(foxLink.ids.away));
        const home = [event.left, event.right].find(team =>
            String(team?.foxTeamId || "") === String(foxLink.ids.home));
        return away && home ? { away, home } : null;
    }

    function verifyFoxResult(game, phase, foxLink) {
        const reject = (reason, differences = []) => ({ ok: false, reason, differences });
        const espn = getRoverOrderedScoreTeams(game);
        const fox = getFoxOrderedTeams(foxLink);
        if (!espn) return reject("ESPN_TEAM_ID_MISMATCH");
        if (!fox) return reject("FOX_PAIR_MISMATCH");
        const event = foxLink.foxEvent;
        if (!event.date || !game.event?.easternDate || event.date !== game.roverDate ||
            event.date !== game.event.easternDate) {
            return reject("FOX_DATE_MISMATCH");
        }
        const final = event.status?.normalized === "FINAL";
        const halfFinished = final || event.status?.normalized === "HALFTIME" ||
            (["LIVE", "DELAYED"].includes(event.status?.normalized) && Number(event.status.period) >= 2);
        if (phase === "FINAL" ? !final : (!halfFinished || final && phase === "HALFTIME")) {
            return reject("FOX_PHASE_NOT_CONFIRMED");
        }
        const fields = phase === "FINAL" ? ["h1", "h2", "ot", "final"] : ["h1"];
        const differences = [];
        for (const [a, b, label] of [[espn.roverAway, fox.away, "T1"], [espn.roverHome, fox.home, "T2"]]) {
            for (const field of fields) {
                if (!isNumericScoreValue(b?.[field])) return reject("FOX_PERIODS_INCOMPLETE");
                if (!isNumericScoreValue(a?.[field]) || Number(a[field]) !== Number(b[field])) {
                    differences.push(`${label} ${field.toUpperCase()}: ESPN ${a?.[field]}, FOX ${b[field]}`);
                }
            }
            if (phase === "FINAL") {
                if (Number(b.h1) + Number(b.h2) + Number(b.ot) !== Number(b.final)) {
                    differences.push(`${label}: parciales FOX no suman el total`);
                }
                // A single FOX OT column may aggregate multiple ESPN overtime periods.
                if (a.otPeriods?.length > 1 && b.otPeriods?.length > 1 &&
                    (a.otPeriods.length !== b.otPeriods.length || b.otPeriods.some(item =>
                        !a.otPeriods.some(other => other.period === item.period &&
                            isNumericScoreValue(other.value) && Number(other.value) === Number(item.value))))) {
                    differences.push(`${label}: OT por período difiere`);
                }
            } else if (phase === "HALFTIME" &&
                (!isNumericScoreValue(a.final) || Number(a.final) !== Number(b.h1))) {
                differences.push(`${label}: el total ESPN no coincide con H1 FOX`);
            }
        }
        return differences.length ? reject("FOX_ESPN_SCORE_MISMATCH", differences)
            : { ok: true, reason: "MATCH", differences: [], foxEventId: event.foxEventId };
    }

    function clearRoverFieldValue(element) {
        if (!element) {
            return {
                changed: false,
                skipped: true
            };
        }

        const previous = String(element.value ?? "");

        if (previous === "") {
            return {
                changed: false,
                skipped: false,
                previous,
                next: ""
            };
        }

        element.value = "";
        dispatchRoverFieldEvents(element);

        return {
            changed: true,
            skipped: false,
            previous,
            next: ""
        };
    }

    function halftimeDetectionDetails(game) {
        const status = game?.status || {};
        const statusText = [status.name, status.description, status.detail, status.shortDetail].map(clean).join(" ");
        const explicitHalftime = /\bHALF[\s-]?TIME\b/i.test(statusText);
        const explicitEndFirst = /\bEND OF (?:THE )?(?:1ST|FIRST) HALF\b/i.test(statusText);
        const firstHalfScoresAvailable = isNumericScoreValue(game?.away?.h1) && isNumericScoreValue(game?.home?.h1);
        const period1ClockZero = status.state === "in" && Number(status.period) === 1 &&
            /^(?:0+:)?0{1,2}(?::0{2})?$/.test(clean(status.clock));
        const detected = ["LIVE", "DELAYED"].includes(status.normalized) && firstHalfScoresAvailable &&
            (explicitHalftime || explicitEndFirst || period1ClockZero);
        return { detected: Boolean(detected), statusText, firstHalfScoresAvailable,
            explicitHalftime, explicitEndFirst, period1ClockZero,
            period: Number(status.period || 0), clock: clean(status.clock),
            reason: !detected ? "NONE" : explicitHalftime ? "EXPLICIT_HALFTIME_TEXT"
                : explicitEndFirst ? "END_OF_1ST_HALF" : "PERIOD_1_CLOCK_ZERO" };
    }

    function isHalftimeGame(game) {
        return halftimeDetectionDetails(game).detected;
    }

    function isAfterHalftimeCatchUp(game) {
        return Number(game?.status?.period || 0) >= 2 &&
            ["LIVE", "DELAYED"].includes(game?.status?.normalized);
    }


    function getRoverOrderedScoreTeams(game) {
        const expectedAwayId = String(game?.expected?.awayEspnId || "");
        const expectedHomeId = String(game?.expected?.homeEspnId || "");

        const espnTeams = [game?.away, game?.home].filter(Boolean);

        const roverAway = espnTeams.find(
            team => String(team?.teamId || "") === expectedAwayId
        );

        const roverHome = espnTeams.find(
            team => String(team?.teamId || "") === expectedHomeId
        );

        if (!roverAway || !roverHome) {
            return null;
        }

        return {
            roverAway,
            roverHome,
            reversed: game?.pairOrder === "REVERSED"
        };
    }

    function roverStatusValueForGame(game) {
        /*
         * Primera versión conservadora:
         * - Halftime confirmado por ESPN -> H1 COMPLETADO (2)
         * - Final confirmado por ESPN    -> FINALIZADO (3)
         * - Cualquier otro estado        -> no tocar Estado Rover
         */
        if (clean(game?.status?.normalized) === "FINAL") {
            return "3";
        }

        if (isHalftimeGame(game)) {
            return "2";
        }

        return "";
    }

    function buildRoverResultPlan(game) {
        const eventId = String(game?.roverEventId || "").trim();
        if (!eventId) throw new Error("No hay Rover Event ID para construir el plan.");
        const ordered = getRoverOrderedScoreTeams(game);
        if (!ordered) throw new Error("No pude mapear los scores ESPN a T1/T2 por Team ID.");
        const scoreFields = [];
        const clearFields = [];
        for (const [side, team] of [["T1", ordered.roverAway], ["T2", ordered.roverHome]]) {
            for (const [suffix, label, value] of [["Q2", "H1", team.h1], ["Q4", "H2", team.h2],
                ["OT", "OT", team.ot], ["TOT", "Final", team.final]]) {
                scoreFields.push({ id: `${eventId}${side}${suffix}Basq`, label: `${side} ${label}`, value });
            }
            for (const quarter of ["Q1", "Q3"]) {
                clearFields.push({ id: `${eventId}${side}${quarter}Basq`, label: `${side} ${quarter}` });
            }
        }
        return { eventId, statusValue: "3", statusId: `${eventId}-Estado`, editedId: `${eventId}-Edited`,
            pairOrder: game.pairOrder, scoreFields, clearFields };
    }

    function buildRoverHalftimePlan(game, { retrospective = false } = {}) {
        const eventId = String(game?.roverEventId || "").trim();
        if (!eventId) throw new Error("No hay Rover Event ID para construir el plan H1.");
        const ordered = getRoverOrderedScoreTeams(game);
        if (!ordered) throw new Error("No pude mapear los scores ESPN a T1/T2 por Team ID.");
        const scoreFields = [];
        const clearFields = [];
        for (const [side, team] of [["T1", ordered.roverAway], ["T2", ordered.roverHome]]) {
            const h1 = firstHalfTotal(team);
            scoreFields.push({ id: `${eventId}${side}Q2Basq`, label: `${side} H1`, value: h1 },
                { id: `${eventId}${side}TOTBasq`, label: `${side} F/H1`, value: h1 });
            for (const suffix of ["Q1", "Q3", "Q4", "OT"]) {
                clearFields.push({ id: `${eventId}${side}${suffix}Basq`, label: `${side} ${suffix}` });
            }
        }
        return { eventId, statusValue: "2", statusId: `${eventId}-Estado`, editedId: `${eventId}-Edited`,
            pairOrder: game.pairOrder, retrospective, clearFields, scoreFields };
    }

    function verifyRoverResultControls(plan) {
        const container = getEditorContainer();

        if (!container) {
            return {
                ok: false,
                reason: "NO_EDITOR_CONTAINER"
            };
        }

        const rv2Identity =
            getRoverViewKind() ===
            ROVER_VIEW.RV2
                ? getRv2IdentityState({
                    requireEditor: true
                })
                : null;

        const currentId =
            rv2Identity
                ? (
                    rv2Identity.ok
                        ? rv2Identity.eventId
                        : ""
                )
                : getEditorEventId();

        if (currentId !== plan.eventId) {
            return {
                ok: false,
                reason:
                    rv2Identity?.reason ||
                    "EVENT_CHANGED",
                expected:
                    plan.eventId,
                current:
                    currentId,
                rv2Identity
            };
        }

        const requiredIds = new Set([
            ...plan.scoreFields.map(item => item.id),
            ...(plan.clearFields || []).map(item => item.id),
            plan.statusId,
            plan.editedId
        ]);

        const controls = new Map();
        const missing = [];

        for (const id of requiredIds) {
            const element = container.querySelector(
                `#${CSS.escape(id)}`
            );

            if (element) controls.set(id, element);
            else missing.push(id);
        }

        if (missing.length) {
            return {
                ok: false,
                reason: "MISSING_CONTROLS",
                missing
            };
        }

        if (
            plan.statusValue === "2" &&
            clean(controls.get(plan.statusId).value) === "3"
        ) {
            return {
                ok: false,
                reason: "ROVER_ALREADY_FINAL"
            };
        }

        return {
            ok: true,
            container,
            controls
        };
    }


    function logSourceResults(game, foxLink) {
        const fox = getFoxOrderedTeams(foxLink);
        const espn = getRoverOrderedScoreTeams(game);
        const rows = [];
        for (const [source, teams] of [["ESPN", espn ? [espn.roverAway, espn.roverHome] : []],
            ["FOX", fox ? [fox.away, fox.home] : []]]) {
            teams.forEach((team, index) => rows.push({ SOURCE: source, TEAM: `T${index + 1}`,
                NAME: team.name, H1: team.h1, H2: team.h2, OT: team.ot, F: team.final }));
        }
        console.table(rows);
    }

    function deferSourceResults(game, foxLink) {
        setTimeout(() => {
            try {
                logSourceResults(game, foxLink);
            } catch (error) {
                console.warn(
                    `${TAG} Diagnóstico diferido falló:`,
                    error
                );
            }
        }, 0);
    }

    async function updateLinkedResult({
        rover: roverSnapshot = null,
        requestedContextToken =
            contextGate.watchToken
    } = {}) {
        const startedAt = performance.now();

        const requestedRover =
            roverSnapshot?.valid
                ? roverSnapshot
                : getCurrentRoverEvent();

        const requestedEventId = String(
            requestedRover?.roverEventId ||
            getEditorEventId({
                requireReady: false
            })
        );

        const timing = {
            startedAt,
            roverEventId: requestedEventId,
            espnMs: 0,
            foxWaitMs: 0,
            validationMs: 0,
            roverWriteMs: 0,
            foxStartedEarly: false,
            foxLinkWarm: false,
            foxRecoveredLink: false
        };

        const cachedFoxLink =
            requestedRover?.valid
                ? getCachedFoxLinkForRover(
                    requestedRover
                )
                : null;

        timing.foxLinkWarm =
            Boolean(cachedFoxLink?.ok);

        const sourceState = {
            seq: ++sourceNoticeRequestSeq,
            contextToken: requestedContextToken,
            root: getUiRoot(),
            eventId: requestedEventId,
            espn: "pending",
            fox: "pending",
            game: null,
            foxData: null,
            validating: false,
            phase: "",
            done: false,
            result: null
        };
        const showSource = () => publishSourcesNotice(sourceState);
        const finishSource = (reason, phase = "", extra = {}) => {
            sourceState.result = { reason, phase, ...extra };
            showSource();
            sourceState.done = true;
        };
        showSource();

        // Un único resultado FOX compartido por la UI y la validación.
        let earlyFoxGamePromise = Promise.resolve({
            ok: false, reason: "FOX_MAPPING_MISSING"
        });
        if (requestedRover?.valid) {
            timing.foxStartedEarly = true;
            earlyFoxGamePromise = (
                cachedFoxLink?.ok
                    ? fetchFoxGameFromCachedLink(requestedRover, {
                        useCache: false
                    })
                    : warmFoxLink(requestedRover).then(link =>
                        link?.ok
                            ? fetchFoxGameFromCachedLink(requestedRover, {
                                useCache: false
                            })
                            : link
                    )
            ).catch(error => ({
                ok: false,
                reason: cachedFoxLink?.ok
                    ? "FOX_UNAVAILABLE" : "FOX_LINK_WARM_FAILED",
                error
            }));
        }
        const foxRetryNeeded = result =>
            !result?.ok && [
                "FOX_PAIR_OR_DATE_MISMATCH",
                "FOX_LINK_NOT_WARM"
            ].includes(result?.reason);

        void earlyFoxGamePromise.then(result => {
            // El vínculo se recupera una vez disponible el game ESPN.
            if (foxRetryNeeded(result)) return;
            sourceState.foxData = result;
            sourceState.fox = result?.ok ? "ready" : "error";
            showSource();
        });

        const espnStartedAt =
            performance.now();

        const espnPromise =
            readGameFresh({
                quiet: true,
                roverSnapshot:
                    requestedRover?.valid
                        ? requestedRover
                        : null
            });

        void espnPromise.then(result => {
            sourceState.game = result;
            sourceState.espn = result ? "ready" : "error";
            showSource();
        }, () => {
            sourceState.espn = "error";
            showSource();
        });

        let game;

        try {
            game = await espnPromise;
        } catch (error) {
            timing.espnMs = Math.round(
                performance.now() -
                espnStartedAt
            );

            publishUpdateTiming(
                timing,
                "ESPN_UNAVAILABLE"
            );

            finishSource("ESPN_UNAVAILABLE");

            console.error(
                `${TAG} ESPN no disponible:`,
                error
            );

            return {
                ok: false,
                applied: false,
                reason:
                    "ESPN_UNAVAILABLE",
                error
            };
        }

        timing.espnMs = Math.round(
            performance.now() -
            espnStartedAt
        );

        if (!game) {
            publishUpdateTiming(
                timing,
                "NO_GAME_DATA"
            );

            finishSource("NO_GAME_DATA");

            return {
                ok: false,
                applied: false,
                reason: "NO_GAME_DATA"
            };
        }

        if (requestedRover?.valid) {
            promoteActiveLinkGameState(
                requestedRover,
                game
            );
        }

        if (!game.pairMatchesRover) {
            publishUpdateTiming(
                timing,
                "PAIR_MISMATCH"
            );
            finishSource("PAIR_MISMATCH");
            deferSourceResults(game);

            return {
                ok: false,
                applied: false,
                reason:
                    "PAIR_MISMATCH",
                game
            };
        }

        const normalizedStatus =
            clean(game.status.normalized);
        const halftime =
            isHalftimeGame(game);
        const halftimeCatchUp =
            isAfterHalftimeCatchUp(game);
        const final =
            normalizedStatus === "FINAL";

        if (
            !halftime &&
            !halftimeCatchUp &&
            !final
        ) {
            // No finaliza la observación FOX: puede haber llegado a H1/Final
            // antes que ESPN aunque este aún esté en H1/H2/OT.
            showSource();
            void earlyFoxGamePromise.then(async preview => {
                let foxPreview = preview;

                if (foxRetryNeeded(foxPreview)) {
                    // El fallback también se completa si ESPN aún no
                    // alcanzó H1/FINAL; evita una espera sin resolución.
                    if (sourceState.seq !== sourceNoticeRequestSeq ||
                        contextGate.watchToken !== requestedContextToken ||
                        getUiRoot() !== sourceState.root ||
                        getEditorEventId() !== requestedEventId) {
                        return;
                    }

                    try {
                        foxPreview = await resolveFoxGame(
                            game, { useEventCache: false }
                        );
                    } catch (error) {
                        foxPreview = {
                            ok: false,
                            reason: "FOX_UNAVAILABLE",
                            error
                        };
                    }

                    sourceState.foxData = foxPreview;
                    sourceState.fox = foxPreview?.ok ? "ready" : "error";
                    showSource();
                }

                deferSourceResults(game, foxPreview);
            });

            const elapsedMs =
                Math.round(
                    performance.now() -
                    startedAt
                );

            publishUpdateTiming(
                timing,
                "NO_WRITABLE_PHASE"
            );

            console.log(
                `${TAG} Esperando descanso o final · ${elapsedMs} ms`
            );

            return {
                ok: true,
                applied: false,
                reason:
                    "NO_WRITABLE_PHASE",
                game,
                elapsedMs
            };
        }

        const phase = final
            ? "FINAL"
            : halftime
                ? "HALFTIME"
                : "HALFTIME_CATCHUP";

        const validationStartedAt =
            performance.now();

        const payloadValidation =
            validateWritableGamePhase(
                game,
                phase
            );

        timing.validationMs +=
            Math.round(
                performance.now() -
                validationStartedAt
            );

        if (!payloadValidation.ok) {
            publishUpdateTiming(
                timing,
                payloadValidation.reason
            );
            finishSource(payloadValidation.reason);
            deferSourceResults(game);

            return {
                ok: false,
                applied: false,
                reason:
                    payloadValidation.reason,
                phase,
                validation:
                    payloadValidation,
                game
            };
        }

        sourceState.validating = true;
        sourceState.phase = phase;
        showSource();

        const foxWaitStartedAt =
            performance.now();

        let foxLink;

        try {
            foxLink = await earlyFoxGamePromise;
            if (foxRetryNeeded(foxLink)) {
                timing.foxRecoveredLink = true;
                foxLink = await resolveFoxGame(
                    game, { useEventCache: false }
                );
            }
        } catch (error) {
            foxLink = { ok: false, reason: "FOX_UNAVAILABLE", error };
        }

        sourceState.foxData = foxLink;
        sourceState.fox = foxLink?.ok ? "ready" : "error";
        showSource();

                timing.foxWaitMs =
            Math.round(
                performance.now() -
                foxWaitStartedAt
            );

        if (!foxLink?.ok) {
            const reason =
                foxLink?.reason ||
                "FOX_UNAVAILABLE";

            publishUpdateTiming(
                timing,
                reason
            );

            finishSource(reason, phase);

            deferSourceResults(
                game,
                foxLink
            );

            return {
                ok: false,
                applied: false,
                reason,
                phase,
                game,
                foxLink
            };
        }

        const sourceValidationStartedAt =
            performance.now();

        const foxValidation =
            verifyFoxResult(
                game,
                phase,
                foxLink
            );

        timing.validationMs +=
            Math.round(
                performance.now() -
                sourceValidationStartedAt
            );

        deferSourceResults(
            game,
            foxLink
        );

        if (!foxValidation.ok) {
            publishUpdateTiming(
                timing,
                foxValidation.reason
            );

            const first =
                foxValidation
                    .differences?.[0] ||
                foxValidation.reason;

            finishSource(foxValidation.reason, phase);

            console.warn(
                `${TAG} Bloqueado: ${first}`
            );

            return {
                ok: false,
                applied: false,
                reason:
                    foxValidation.reason,
                phase,
                game,
                foxLink,
                foxValidation
            };
        }

        if (
            contextGate.dirty ||
            contextGate.watchToken !==
                requestedContextToken ||
            !isCBBView()
        ) {
            publishUpdateTiming(
                timing,
                "CONTEXT_CHANGED"
            );

            sourceState.done = true;
            return {
                ok: false,
                applied: false,
                reason:
                    "CONTEXT_CHANGED",
                phase,
                game
            };
        }

        const currentRover =
            getCurrentRoverEvent();

        if (
            !currentRover?.valid ||
            currentRover.roverEventId !==
                game.roverEventId ||
            currentRover.date !==
                game.roverDate ||
            String(
                currentRover.away
                    ?.roverCode || ""
            ) !==
                game.expected
                    .awayRoverCode ||
            String(
                currentRover.home
                    ?.roverCode || ""
            ) !==
                game.expected
                    .homeRoverCode
        ) {
            publishUpdateTiming(
                timing,
                "ROVER_GAME_CHANGED"
            );

            sourceState.done = true;
            return {
                ok: false,
                applied: false,
                reason:
                    "ROVER_GAME_CHANGED",
                phase,
                game
            };
        }

        const plan = final
            ? buildRoverResultPlan(game)
            : buildRoverHalftimePlan(
                game,
                {
                    retrospective:
                        halftimeCatchUp
                }
            );

        const verification =
            verifyRoverResultControls(
                plan
            );

        if (!verification.ok) {
            publishUpdateTiming(
                timing,
                verification.reason
            );

            finishSource(verification.reason);

            return {
                ok: false,
                applied: false,
                reason:
                    verification.reason,
                verification,
                game
            };
        }

        const writeStartedAt =
            performance.now();

        const changes = [];

        for (
            const item of
            plan.clearFields || []
        ) {
            const element =
                verification.controls.get(
                    item.id
                );

            const result =
                clearRoverFieldValue(
                    element
                );

            changes.push({
                CAMPO: item.id,
                DATO:
                    `${item.label} (LIMPIAR)`,
                ANTES:
                    result.previous ?? "",
                ESPN: "",
                CAMBIO:
                    result.changed
                        ? "SI"
                        : "NO",
                OMITIDO:
                    result.skipped
                        ? "SI"
                        : "NO"
            });
        }

        for (
            const item of
            plan.scoreFields
        ) {
            const element =
                verification.controls.get(
                    item.id
                );

            const result =
                setRoverFieldValue(
                    element,
                    item.value
                );

            changes.push({
                CAMPO: item.id,
                DATO: item.label,
                ANTES:
                    result.previous ?? "",
                ESPN: item.value,
                CAMBIO:
                    result.changed
                        ? "SI"
                        : "NO",
                OMITIDO:
                    result.skipped
                        ? "SI"
                        : "NO"
            });
        }

        const statusElement =
            verification.controls.get(
                plan.statusId
            );

        const statusResult =
            setRoverFieldValue(
                statusElement,
                plan.statusValue
            );

        changes.push({
            CAMPO: plan.statusId,
            DATO: "ESTADO",
            ANTES:
                statusResult.previous ??
                "",
            ESPN:
                plan.statusValue,
            CAMBIO:
                statusResult.changed
                    ? "SI"
                    : "NO",
            OMITIDO:
                statusResult.skipped
                    ? "SI"
                    : "NO"
        });

        const anyChanged =
            changes.some(
                item =>
                    item.CAMBIO === "SI"
            );

        if (anyChanged) {
            const edited =
                verification.controls.get(
                    plan.editedId
                );

            if (edited) {
                setRoverFieldValue(
                    edited,
                    "1"
                );
            }
        }

        timing.roverWriteMs =
            Math.round(
                performance.now() -
                writeStartedAt
            );

        finishSource("APPLIED", phase, { changed: anyChanged });

                const elapsedMs =
            Math.round(
                performance.now() -
                startedAt
            );

        publishUpdateTiming(
            timing,
            "APPLIED"
        );

        console.log(
            `${TAG} ESPN = FOX · ${anyChanged ? "Rover actualizado" : "Rover ya coincidía"} · ${elapsedMs} ms`
        );

        return {
            ok: true,
            applied: true,
            phase: final
                ? "FINAL"
                : halftimeCatchUp
                    ? "HALFTIME_CATCHUP"
                    : "HALFTIME",
            game,
            plan,
            changes,
            changed: anyChanged,
            elapsedMs
        };
    }


    // ============================================================
    // MOD 18 - UI
    // ============================================================

    const UI_ID = "rs-espn-cbb-ui";
    const STYLE_ID = "rs-espn-cbb-style";

    const uiState = {
        renderSeq: 0,
        renderTimer: 0,
        containerObserver: null,
        observedContainer: null,
        active: false,
        lastEditorId: "",
        manualCandidates: new Map(),
        pollTimer: 0,
        pendingSafetyTimer: 0,
        observedTable: null,
        tableObserver: null,
        tableValidation: null,
        tableValidationEditorId: "",
        pageObserver: null,
        syncTimer: 0
    };

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${UI_ID} {
                box-sizing: border-box;
                width: 100%;
                margin: 5px 0 7px 0;
                padding: 0;
                border: 0;
                background: transparent;
                color: #263238;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 15px;
                line-height: 1.45;
            }

            #${UI_ID} * { box-sizing: border-box; }

            #${UI_ID} .rs-cbb-link-row {
                display: flex;
                align-items: stretch;
                gap: 5px;
                width: 100%;
                min-height: 34px;
            }

            #${UI_ID} .rs-cbb-label {
                flex: 0 0 90px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                padding: 0 3px;
                color: #006dcc;
                font-size: 14px;
                font-weight: 700;
                line-height: 1.2;
                text-transform: uppercase;
                white-space: nowrap;
            }

            #${UI_ID} .rs-cbb-label-mode {
                margin-top: 2px;
                color: #6b7785;
                font-size: 12px;
                font-weight: 700;
            }

            #${UI_ID} .rs-cbb-field {
                flex: 1 1 auto;
                min-width: 0;
                min-height: 34px;
                display: flex;
                align-items: center;
                padding: 4px 8px;
                border: 1px solid #66bb6a;
                background: #f7fff7;
                color: #263238;
                cursor: default;
                overflow: hidden;
                user-select: none;
            }

            #${UI_ID} .rs-cbb-field-main {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 14px;
                font-weight: 600;
            }

            #${UI_ID} .rs-cbb-result-notice {
                display: none;
                flex: 0 0 auto;
                margin-left: auto;
                padding: 2px 7px;
                border-radius: 3px;
                white-space: nowrap;
                font-size: 13px;
                font-weight: 700;
                line-height: 1.35;
            }

            #${UI_ID} .rs-cbb-result-notice.is-live {
                display: inline-flex;
                background: #fff3cd;
                color: #7a5a00;
                border: 1px solid #e7c968;
            }

            #${UI_ID} .rs-cbb-result-notice.is-waiting {
                display: inline-flex;
                background: #e8f3ff;
                color: #245b8d;
                border: 1px solid #a8ccec;
            }

            #${UI_ID} .rs-cbb-result-notice.is-final {
                display: inline-flex;
                background: #e8f5e9;
                color: #2e7d32;
                border: 1px solid #81c784;
            }

            #${UI_ID} .rs-cbb-result-notice.is-pre {
                display: inline-flex;
                background: #eef3f6;
                color: #546e7a;
                border: 1px solid #b0bec5;
            }

            #${UI_ID} .rs-cbb-result-notice.is-error {
                display: inline-flex;
                background: #fff1f0;
                color: #a12622;
                border: 1px solid #e6a09c;
            }

            #${UI_ID} .rs-cbb-order-notice {
                display: inline-flex;
                align-items: center;
                flex: 0 0 auto;
                padding: 2px 7px;
                border: 1px solid #e1a647;
                border-radius: 3px;
                background: #fff4dc;
                color: #8a5a00;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 13px;
                font-weight: 700;
                line-height: 1.35;
                cursor: pointer;
            }

            #${UI_ID} .rs-cbb-order-notice:hover {
                background: #ffe8b5;
                text-decoration: underline;
            }

            #${UI_ID} .rs-cbb-field {
                gap: 8px;
            }

            #${UI_ID} .rs-cbb-field-main {
                flex: 1 1 auto;
                min-width: 0;
            }

            #${UI_ID} .rs-cbb-field-loading {
                border-color: #f0ad4e;
                background: #fffdf5;
                color: #7a5a00;
            }

            #${UI_ID} .rs-cbb-field-manual {
                border-color: #5bc0de;
                background: #f5fcff;
            }

            #${UI_ID} .rs-cbb-field-disabled {
                border-color: #b0bec5;
                background: #f5f7f8;
                color: #607d8b;
            }

            #${UI_ID} .rs-cbb-field-error {
                border-color: #d9534f;
                background: #fff8f8;
                color: #9d2320;
            }

            #${UI_ID} .rs-cbb-icon-btn {
                flex: 0 0 36px;
                width: 36px;
                min-width: 36px;
                min-height: 34px;
                padding: 0;
                border: 0;
                border-radius: 0;
                color: #fff;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 17px;
                font-weight: 700;
                line-height: 34px;
                text-align: center;
                cursor: pointer;
            }

            #${UI_ID} .rs-cbb-refresh {
                background: #9675ce;
            }

            #${UI_ID} .rs-cbb-edit {
                background: #03a9f3;
                font-size: 18px;
                font-weight: 700;
            }

            #${UI_ID} .rs-cbb-unlink {
                background: #f39a7a;
            }

            #${UI_ID} .rs-cbb-auto-btn {
                background: #5cb85c;
                font-size: 13px;
                font-weight: 700;
            }

            #${UI_ID} .rs-cbb-icon-btn:hover {
                filter: brightness(.94);
            }

            #${UI_ID} button:disabled,
            #${UI_ID} select:disabled,
            #${UI_ID} input:disabled {
                opacity: .55;
                cursor: wait;
            }

            #${UI_ID} .rs-cbb-manual-panel {
                margin: 6px 0 0 95px;
                padding: 7px;
                border: 1px solid #cfd8dc;
                background: #fff;
            }

            #${UI_ID} .rs-cbb-manual-title {
                margin-bottom: 5px;
                color: #455a64;
                font-size: 14px;
                font-weight: 700;
            }

            #${UI_ID} .rs-cbb-meta {
                color: #607d8b;
                font-size: 13px;
                line-height: 1.4;
                margin-top: 3px;
                word-break: break-word;
            }

            #${UI_ID} .rs-cbb-manual-preview {
                margin-top: 7px;
                padding: 7px 9px;
                border: 1px solid #d7e3e8;
                background: #f8fbfc;
                font-size: 14px;
                line-height: 1.45;
            }

            #${UI_ID} .rs-cbb-manual-preview strong {
                font-weight: 700;
            }

            #${UI_ID} .rs-cbb-manual-preview .rs-cbb-rover-line {
                color: #455a64;
            }

            #${UI_ID} .rs-cbb-manual-preview .rs-cbb-espn-line {
                margin-top: 3px;
                color: #286090;
                font-weight: 600;
            }

            #${UI_ID} .rs-cbb-manual-row {
                display: flex;
                gap: 5px;
                align-items: center;
                flex-wrap: wrap;
                margin-top: 5px;
            }

            #${UI_ID} .rs-cbb-manual-row select {
                flex: 1 1 430px;
                min-width: 220px;
                height: 34px;
                padding: 5px 8px;
                border: 1px solid #9fb3bf;
                background: #fff;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 14px;
                font-weight: 500;
            }

            #${UI_ID} .rs-cbb-manual-row input {
                width: 170px;
                height: 34px;
                padding: 5px 8px;
                border: 1px solid #9fb3bf;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 14px;
                font-weight: 500;
            }

            #${UI_ID} .rs-cbb-manual-row button {
                min-height: 34px;
                padding: 5px 10px;
                border: 1px solid #9fb3bf;
                background: #f7f9fa;
                color: #37474f;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            }

            #${UI_ID} .rs-cbb-manual-row .rs-cbb-primary {
                border-color: #5bc0de;
                background: #f3fbfe;
                color: #286090;
            }

            @media (max-width: 780px) {
                #${UI_ID} .rs-cbb-label {
                    flex-basis: 72px;
                }
                #${UI_ID} .rs-cbb-manual-panel {
                    margin-left: 77px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function getUiRoot() {
        return document.getElementById(UI_ID);
    }

    function removeUi() {
        getUiRoot()?.remove();
        uiState.manualCandidates.clear();
        clearTimeout(uiState.pendingSafetyTimer);
        uiState.pendingSafetyTimer = 0;
    }

    function findUiAnchor(roverEventId) {
        const container = getEditorContainer();

        if (!container) {
            return null;
        }

        const id = String(roverEventId || "");

        if (id) {
            for (const suffix of ["-Estado", "-Edited"]) {
                const control = container.querySelector(
                    `#${CSS.escape(id + suffix)}`
                );

                const table = control?.closest("table");

                if (table) {
                    return table.closest(".table-responsive") || table;
                }
            }

            const eventTable = [...container.querySelectorAll("table")]
                .find(table =>
                    clean(table.innerText).includes(`#${id}`)
                );

            if (eventTable) {
                return eventTable.closest(".table-responsive") || eventTable;
            }
        }

        return container.querySelector("table") || null;
    }

    function ensureUiRoot(roverEventId) {
        const container = getEditorContainer();

        if (!container) {
            return null;
        }

        let root = getUiRoot();

        if (!root || !container.contains(root)) {
            root = document.createElement("div");
            root.id = UI_ID;
            root.addEventListener("click", onUiClick);
        }

        root.dataset.roverEventId = String(roverEventId || "");
        root.dataset.roverView = getRoverViewKind();

        const anchor = findUiAnchor(roverEventId);

        if (anchor?.parentNode) {
            if (
                root.nextSibling !== anchor ||
                root.parentNode !== anchor.parentNode
            ) {
                anchor.parentNode.insertBefore(root, anchor);
            }
        } else if (!root.parentNode) {
            container.appendChild(root);
        }

        return root;
    }


    function uiStillCurrent(seq, roverEventId) {
        if (seq !== uiState.renderSeq || !isCBBView()) {
            return false;
        }

        return (
            getEditorEventId() ===
            String(roverEventId || "")
        );
    }


    function setUiBusy(root, busy) {
        if (!root) return;
        root.querySelectorAll("button, select, input, [data-espn-action]").forEach(el => {
            if ("disabled" in el) {
                el.disabled = !!busy;
            }
            el.style.pointerEvents = busy ? "none" : "";
        });
    }

    function teamLine(rover) {
        return `${escapeHtml(rover.away.roverCode)} ${escapeHtml(rover.away.roverName)} @ ` +
               `${escapeHtml(rover.home.roverCode)} ${escapeHtml(rover.home.roverName)}`;
    }

    function basketballPeriodLabel(game) {
        const status = game?.status || {};
        if (/half[ -]?time/i.test([status.detail, status.shortDetail, status.description].join(" "))) return "HALFTIME";
        const period = Number(status.period || 0);
        if (period === 1 || period === 2) return `H${period}`;
        return period >= 3 ? period === 3 ? "OT" : `${period - 2}OT` : "";
    }

    function currentGameScoreText(game) {
        const ordered = getRoverOrderedScoreTeams(game);

        const away =
            ordered?.roverAway?.final ??
            game?.away?.final;
        const home =
            ordered?.roverHome?.final ??
            game?.home?.final;

        const awayText =
            away === "" ||
            away === null ||
            away === undefined
                ? "—"
                : String(away);

        const homeText =
            home === "" ||
            home === null ||
            home === undefined
                ? "—"
                : String(home);

        return `${awayText}-${homeText}`;
    }

    function firstHalfScoreText(game) {
        const ordered =
            getRoverOrderedScoreTeams(game);

        const awayTeam =
            ordered?.roverAway ??
            game?.away;
        const homeTeam =
            ordered?.roverHome ??
            game?.home;

        const awayH1 =
            firstHalfTotal(awayTeam);
        const homeH1 =
            firstHalfTotal(homeTeam);

        const awayText =
            isNumericScoreValue(awayH1)
                ? String(awayH1)
                : "—";

        const homeText =
            isNumericScoreValue(homeH1)
                ? String(homeH1)
                : "—";

        return `${awayText}-${homeText}`;
    }

    function overtimeCountForGame(game) {
        const periods = [Number(game?.status?.period || 0),
            ...[game?.away, game?.home].flatMap(team => (team?.otPeriods || []).map(item => Number(item.period)))];
        return Math.max(0, ...periods.map(period => period - 2));
    }

    function overtimeLabelForGame(game) {
        const count =
            overtimeCountForGame(game);

        if (count <= 0) {
            return "";
        }

        return count === 1
            ? "OT"
            : `${count}OT`;
    }


    function formatEspnDateTimeEt(isoDate) {
        const raw = clean(isoDate);

        if (!raw) {
            return "";
        }

        const date = new Date(raw);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        try {
            return new Intl.DateTimeFormat("es-DO", {
                timeZone: "America/New_York",
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }).format(date);
        } catch {
            return "";
        }
    }

    function buildGameProgressNotice(game) {
        const normalized =
            clean(
                game?.status?.normalized
            );

        const period =
            basketballPeriodLabel(game);

        const clock =
            clean(
                game?.status?.clock
            );

        const h1 =
            firstHalfScoreText(game);

        const finalScore =
            currentGameScoreText(game);

        if (normalized === "FINAL") {
            const otLabel =
                overtimeLabelForGame(game);

            return {
                className: "is-final",
                text:
                    `H1 ${h1} | Final ${finalScore}${otLabel ? ` (${otLabel})` : ""}`,
                title:
                    `${game.away.name} ${game.away.final} - ${game.home.final} ${game.home.name}`
            };
        }

        if (isHalftimeGame(game)) {
            return {
                className: "is-live",
                text: `H1 ${h1}`,
                title:
                    `${game.away.name} ${game.away.final} - ${game.home.final} ${game.home.name} · Halftime`
            };
        }

        if (normalized === "LIVE") {
            const statusPeriod =
                Number(
                    game?.status?.period || 0
                );

            const validClock =
                clock &&
                !/^0+:?0*$/i.test(clock);

            const periodClock =
                [
                    period,
                    validClock
                        ? clock
                        : ""
                ]
                    .filter(Boolean)
                    .join(" · ");

            /*
             * Before H1: period + clock only.
             * After H1: preserve H1 on the left and show only
             * current period + clock on the right.
             */
            const afterHalf =
                statusPeriod >= 2;

            return {
                className: "is-live",
                text: afterHalf
                    ? `H1 ${h1} | ${periodClock || period || "EN VIVO"}`
                    : (
                        periodClock ||
                        period ||
                        "EN VIVO"
                    ),
                title:
                    `${game.away.name} ${game.away.final} - ${game.home.final} ${game.home.name}` +
                    `${period ? ` · ${period}` : ""}` +
                    `${clock ? ` · ${clock}` : ""}`
            };
        }

        if (normalized === "NOT_STARTED") {
            return {
                className: "is-pre",
                text: "No iniciado",
                title:
                    `${game.away.name} @ ${game.home.name}`
            };
        }

        if (normalized === "CANCELED") {
            return {
                className: "is-error",
                text: "CANCELADO",
                title:
                    `${game.away.name} @ ${game.home.name}`
            };
        }

        if (normalized === "DELAYED") {
            const detail = clean(
                game?.status?.detail ||
                game?.status?.shortDetail ||
                game?.status?.description ||
                ""
            );

            return {
                className: "is-live",
                text: detail
                    ? `RETRASADO · ${detail}`
                    : "RETRASADO",
                title:
                    `${game.away.name} @ ${game.home.name}`
            };
        }

        if (normalized === "POSTPONED") {
            const newDate =
                formatEspnDateTimeEt(
                    game?.event?.date
                );

            const roverDate =
                clean(
                    game?.roverDate
                );

            const espnDateEt =
                clean(
                    game?.event?.easternDate
                );

            const movedToAnotherDate =
                Boolean(
                    newDate &&
                    espnDateEt &&
                    roverDate &&
                    espnDateEt !== roverDate
                );

            return {
                className: "is-error",
                text:
                    movedToAnotherDate
                        ? `POSPUESTO · ${newDate} ET`
                        : "POSPUESTO",
                title:
                    movedToAnotherDate
                        ? `${game.away.name} @ ${game.home.name} · nueva fecha ESPN: ${newDate} ET`
                        : `${game.away.name} @ ${game.home.name}`
            };
        }

        const detail = clean(
            game?.status?.detail ||
            game?.status?.shortDetail ||
            game?.status?.description ||
            normalized ||
            "SIN ESTADO"
        );

        return {
            className: "is-pre",
            text: detail,
            title:
                `${game.away.name} @ ${game.home.name}`
        };
    }


    function setResultNotice(root, notice) {
        const element = root?.querySelector('[data-role="result-notice"]');

        if (!element) {
            return;
        }

        element.className = "rs-cbb-result-notice";

        if (!notice?.text) {
            element.textContent = "";
            element.removeAttribute("title");
            return;
        }

        if (notice.className) {
            element.classList.add(notice.className);
        }

        element.textContent = notice.text;

        if (notice.title) {
            element.title = notice.title;
        } else {
            element.removeAttribute("title");
        }
    }

    function setResultNoticeForGame(game) {
        setGameResultNotice(game, buildGameProgressNotice(game));
    }

    function setGameResultNotice(game, notice) {
        const root = getUiRoot();
        const eventId = String(game?.roverEventId || "");
        const editorId = getEditorEventId();

        if (
            root?.dataset.roverEventId === eventId &&
            editorId === eventId
        ) {
            setResultNotice(root, notice);
        }
    }


    function setResultNoticeError(message, game = null) {
        const notice = {
            className: "is-error",
            text: clean(message || "ERROR ESPN")
        };
        if (game) setGameResultNotice(game, notice);
        else setResultNotice(getUiRoot(), notice);
    }

    /*
     * Motor único de mensajes ESPN/FOX. No interviene en la validación,
     * en el plan de campos ni en los permisos para escribir en Rover.
     */
    function buildSourcesNotice(state = {}) {
        const fail = (text, className = "is-pre", title =
            "No se modificó Rover. Revisa ESPN y FOX en la consola.") =>
            ({ text, className, title });
        const wait = (source, phase = "", request = false) => ({
            className: "is-waiting",
            text: request
                ? `Esperando respuesta de ${source}…`
                : `Esperando a ${source} · ${phase}`,
            title: request
                ? `Consulta a ${source} pendiente. Rover no cambió.`
                : `${source} aún no confirma ${phase === "Final" ? "el final" : "el descanso"}. Rover no cambió.`
        });
        const reason = clean(state.result?.reason || "");
        const phase = clean(state.result?.phase || state.phase || "");
        const game = state.game;
        if (reason === "APPLIED" && game) {
            const canonical = buildGameProgressNotice(game);
            return { ...canonical,
                title: `${canonical.title || ""} · ESPN y FOX coinciden. ${state.result.changed ? "Rover fue actualizado." : "Rover ya tenía esos valores."}`
            };
        }
        if (["ESPN_UNAVAILABLE","NO_GAME_DATA"].includes(reason))
            return fail("ESPN no disponible");
        if (["INCOMPLETE_ESPN_SCORE","INCONSISTENT_ESPN_SCORE",
             "TEAM_ID_MAPPING_FAILED"].includes(reason))
            return fail("ESPN incompleto");
        if (["FOX_UNAVAILABLE","FOX_LINK_WARM_FAILED"].includes(reason))
            return fail("FOX no disponible");
        if (["FOX_GAME_NOT_FOUND","FOX_MAPPING_MISSING","FOX_LINK_NOT_WARM"].includes(reason))
            return fail("FOX sin datos");
        if (reason === "FOX_GAME_AMBIGUOUS")
            return fail("Partido sin confirmar");
        if (["FOX_PERIODS_INCOMPLETE","FOX_PERIODS_INVALID"].includes(reason))
            return fail("FOX incompleto");
        if (reason === "FOX_PHASE_NOT_CONFIRMED")
            return wait("FOX", phase === "FINAL" ? "Final" : "H1");
        if (["PAIR_MISMATCH","FOX_PAIR_MISMATCH","FOX_DATE_MISMATCH",
             "FOX_PAIR_OR_DATE_MISMATCH","ESPN_TEAM_ID_MISMATCH"].includes(reason))
            return fail("Partidos distintos", "is-error",
                "La identidad o fecha del partido no coincide. Rover no cambió.");
        if (reason === "FOX_ESPN_SCORE_MISMATCH")
            return fail("Fuentes no coinciden", "is-error",
                "ESPN y FOX muestran resultados diferentes. Rover no cambió.");
        if (reason === "ROVER_ALREADY_FINAL")
            return fail("Rover ya está en final", "is-error");
        if (reason) return fail(reason === "MISSING_CONTROLS"
                ? "No se pudo llenar" : "No se pudo comparar", "is-error");

        if (state.espn === "error") return fail("ESPN no disponible");
        if (state.fox === "error") return buildSourcesNotice({
            result: {reason: state.foxData?.reason || "FOX_UNAVAILABLE", phase}
        });
        if (state.espn === "pending" && state.fox === "pending")
            return fail("Consultando ESPN y FOX…", "is-pre",
                "Ambas consultas en curso. Rover no cambió.");
        if (state.espn === "pending") return wait("ESPN", "", true);
        if (state.fox === "pending") return wait("FOX", "", true);

        if (!game || !state.foxData?.ok || !state.foxData.foxEvent)
            return fail("No se pudo comparar", "is-error");

        const espnStatus = clean(game.status?.normalized);
        const foxStatus = clean(state.foxData.foxEvent.status?.normalized);
        const foxPeriod = Number(state.foxData.foxEvent.status?.period || 0);
        const espnFinal = espnStatus === "FINAL", foxFinal = foxStatus === "FINAL";

        // Cancelaciones y aplazamientos no son desfases de actualización.
        if (!["POSTPONED", "CANCELED"].includes(espnStatus)) {
            if (espnFinal && !foxFinal) return wait("FOX", "Final");
            if (foxFinal && !espnFinal) return wait("ESPN", "Final");
            const espnH1 = espnFinal || isHalftimeGame(game) ||
                isAfterHalftimeCatchUp(game);
            const foxH1 = foxFinal || foxStatus === "HALFTIME" ||
                (["LIVE", "DELAYED"].includes(foxStatus) && foxPeriod >= 2);
            if (espnH1 && !foxH1) return wait("FOX", "H1");
            if (foxH1 && !espnH1) return wait("ESPN", "H1");
        }

        if (state.validating &&
            (espnFinal || isHalftimeGame(game) || isAfterHalftimeCatchUp(game)))
            return fail("Comparando resultados…", "is-pre",
                "Verificando ESPN y FOX antes de modificar Rover.");

        return buildGameProgressNotice(game);
    }

    function publishSourcesNotice(state) {
        if (state.done || state.seq !== sourceNoticeRequestSeq ||
            contextGate.dirty ||
            contextGate.watchToken !== state.contextToken ||
            !isCBBView() || getUiRoot() !== state.root ||
            state.root?.dataset.roverEventId !== state.eventId ||
            getEditorEventId() !== state.eventId) return;
        setResultNotice(state.root, buildSourcesNotice(state));
    }

    function espnGameUrl(eventId) {
        const id = String(eventId || "").trim();

        if (!/^\d+$/.test(id)) {
            return "";
        }

        return `https://www.espn.com/mens-college-basketball/game/_/gameId/${id}`;
    }

    function compactLinkRow({
        mode,
        fieldClass = "",
        fieldText,
        title = "",
        rightAction = "unlink",
        orderNotice = "",
        espnEventId = ""
    }) {
        const modeText = mode
            ? `<span class="rs-cbb-label-mode">${escapeHtml(mode)}</span>`
            : "";

        const rightButton = rightAction === "auto"
            ? `<button class="rs-cbb-icon-btn rs-cbb-auto-btn" data-espn-action="auto" title="Reactivar vínculo automático">AUTO</button>`
            : `<button class="rs-cbb-icon-btn rs-cbb-unlink" data-espn-action="unlink" title="Desvincular / desactivar AUTO">×</button>`;

        const orderBadge = orderNotice && espnEventId
            ? `<button type="button"
                       class="rs-cbb-order-notice"
                       data-espn-action="open-espn"
                       data-espn-event-id="${escapeHtml(espnEventId)}"
                       title="Orden HOME/AWAY invertido entre Rover y ESPN. Clic para abrir el evento en ESPN.">${escapeHtml(orderNotice)}</button>`
            : "";

        return `
            <div class="rs-cbb-link-row">
                <div class="rs-cbb-label">CBB${modeText}</div>
                <div class="rs-cbb-field ${fieldClass}" title="${escapeHtml(title || "Información del vínculo ESPN")}">
                    <span class="rs-cbb-field-main">${fieldText}</span>
                    ${orderBadge}
                    <span class="rs-cbb-result-notice" data-role="result-notice"></span>
                </div>
                <button class="rs-cbb-icon-btn rs-cbb-refresh" data-espn-action="update-result" title="Actualizar resultado del evento ESPN vinculado">↻</button>
                <button class="rs-cbb-icon-btn rs-cbb-edit" data-espn-action="manual-search" title="Editar vínculo ESPN">✎</button>
                ${rightButton}
            </div>
        `;
    }

    function roverRowPreview(row) {
        if (!row) return null;

        const parsed = parseRoverRow(row);

        if (parsed) {
            const away = parsed.away?.roverName || "";
            const home = parsed.home?.roverName || "";

            return {
                eventId: parsed.roverEventId,
                away,
                home,
                text:
                    away && home
                        ? `${away} @ ${home}`
                        : `Rover #${parsed.roverEventId}`
            };
        }

        const eventId = parseEventIdFromRow(row);

        if (!eventId) {
            return null;
        }

        const cells = [...row.querySelectorAll("td")];
        const away = clean(cells[1]?.innerText || "");
        const home = clean(cells[2]?.innerText || "");

        return {
            eventId,
            away,
            home,
            text:
                away && home
                    ? `${away} @ ${home}`
                    : `Rover #${eventId}`
        };
    }

    const rowPrewarmInFlight =
        new Map();

    function roverSnapshotFromRow(row) {
        const parsed =
            parseRoverRow(row);

        if (
            !parsed?.validIdentity ||
            !parsed.roverEventId ||
            !parsed.date ||
            !parsed.away ||
            !parsed.home
        ) {
            return null;
        }

        return {
            valid: true,
            reason: "",
            roverEventId:
                parsed.roverEventId,
            date: parsed.date,
            away: parsed.away,
            home: parsed.home,
            identity: {
                editor:
                    parsed.roverEventId,
                ...parsed.identity
            }
        };
    }

    async function prewarmSelectedRoverRow(
        row
    ) {
        if (
            !isCBBView() ||
            contextGate.dirty
        ) {
            return null;
        }

        const rover =
            roverSnapshotFromRow(row);

        if (!rover?.valid) {
            return null;
        }

        const signature =
            roverLinkSignature(rover);

        return singleFlight(
            rowPrewarmInFlight,
            signature,
            async () => {
                const token =
                    contextGate.watchToken;
                const override =
                    getOverride(
                        rover.roverEventId
                    );

                const foxTask =
                    override?.mode ===
                    "disabled"
                        ? Promise.resolve(
                            {
                                ok: false,
                                reason:
                                    "AUTO_DISABLED"
                            }
                        )
                        : warmFoxLink(
                            rover
                        );

                const espnTask =
                    override
                        ? Promise.resolve(
                            null
                        )
                        : resolveRoverAutoShared(
                            rover,
                            {
                                useCache: true,
                                scheduleFallback:
                                    true
                            }
                        );

                const [
                    espnSettled,
                    foxSettled
                ] =
                    await Promise.allSettled([
                        espnTask,
                        foxTask
                    ]);

                if (
                    token !==
                        contextGate.watchToken ||
                    contextGate.dirty ||
                    !isCBBView()
                ) {
                    return {
                        ok: false,
                        reason:
                            "PREWARM_CONTEXT_CHANGED"
                    };
                }

                if (
                    espnSettled.status ===
                        "fulfilled" &&
                    acceptedAutoLinkStatus(
                        espnSettled.value
                            ?.ESTADO
                    ) &&
                    espnSettled.value
                        ?.ESPN_EVENT_ID
                ) {
                    setActiveAutoLink(
                        rover,
                        espnSettled.value
                    );
                }

                return {
                    ok: true,
                    rover,
                    espn:
                        espnSettled.status ===
                        "fulfilled"
                            ? espnSettled.value
                            : null,
                    fox:
                        foxSettled.status ===
                        "fulfilled"
                            ? foxSettled.value
                            : null
                };
            }
        );
    }

    function renderPendingSelection(row) {
        if (!isCBBView() || contextGate.dirty) {
            return;
        }

        const preview = roverRowPreview(row);

        if (!preview) {
            return;
        }

        const currentEditorId =
            getEditorEventId({
                requireReady: false
            });

        /*
         * Si el usuario vuelve a hacer click sobre el MISMO evento que ya
         * está cargado, no cambiamos la barra a "cargando...".
         *
         * Rover recargará su editor por AJAX; cuando el response real
         * llegue, el observer reconstruirá la barra en la posición correcta.
         */
        if (currentEditorId === preview.eventId) {
            clearTimeout(uiState.pendingSafetyTimer);
            return;
        }

        const root = ensureUiRoot(currentEditorId || preview.eventId);

        if (!root) {
            return;
        }

        root.dataset.pendingEventId = preview.eventId;

        root.innerHTML = compactLinkRow({
            mode: "AUTO",
            fieldClass: "rs-cbb-field-loading",
            fieldText: `${escapeHtml(preview.text)} — cargando…`,
            title: `Cargando Rover #${preview.eventId}`
        });

        setUiBusy(root, true);

        /*
         * Red de seguridad: si el AJAX de Rover falla y el root no llega a
         * ser reemplazado, nunca dejamos los controles bloqueados para
         * siempre.
         */
        clearTimeout(uiState.pendingSafetyTimer);

        uiState.pendingSafetyTimer = setTimeout(() => {
            const pendingRoot = getUiRoot();

            if (
                pendingRoot?.dataset.pendingEventId === preview.eventId
            ) {
                setUiBusy(pendingRoot, false);
            }
        }, 4000);
    }


    function renderAutoLoading(root, rover) {
        root.innerHTML = compactLinkRow({
            mode: "AUTO",
            fieldClass: "rs-cbb-field-loading",
            fieldText: `Buscando ESPN para ${teamLine(rover)}...`,
            title: `Rover #${rover.roverEventId} · ${rover.date}`
        });
    }

    function renderAutoResult(root, rover, result) {
        const ok =
            acceptedAutoLinkStatus(result?.ESTADO) &&
            result?.ESPN_EVENT_ID;

        if (ok) {
            const reversed = result.ESTADO === "REVERSED_PAIR";

            const fieldText =
                `${teamLine(rover)} — ESPN #${escapeHtml(result.ESPN_EVENT_ID)}`;

            const title =
                `${result.ESPN_EVENT || "Evento ESPN"} · ${result.ESTADO}` +
                (result.FUENTE ? ` · ${result.FUENTE}` : "");

            root.innerHTML = compactLinkRow({
                mode: "AUTO",
                fieldText,
                title,
                orderNotice: reversed ? "Orden invertido" : "",
                espnEventId: reversed ? result.ESPN_EVENT_ID : ""
            });

            return;
        }

        root.innerHTML = compactLinkRow({
            mode: "AUTO",
            fieldClass: "rs-cbb-field-error",
            fieldText: `Sin vínculo automático — ${escapeHtml(result?.ESTADO || "SIN MATCH")}`,
            title: `${teamLine(rover)} · Clic para buscar un evento ESPN manualmente`
        });
    }

    function manualOverrideEventText(override) {
        const id = clean(override?.espnEventId);
        const away = clean(override?.awayName);
        const home = clean(override?.homeName);
        const eventName = clean(override?.eventName);

        if (away && home) {
            return `${away} @ ${home} — ESPN #${id}`;
        }

        if (eventName && !/^ESPN Event #/i.test(eventName)) {
            return `${eventName} — ESPN #${id}`;
        }

        return `ESPN Event #${id}`;
    }

    function manualCandidateLabel(event) {
        if (!event) {
            return "Sin evento ESPN seleccionado";
        }

        const time = eventTimeEt(event.date);
        return `${clean(event.away)} @ ${clean(event.home)}` +
            `${time ? ` — ${time} ET` : ""} — ESPN #${event.eventId}`;
    }

    function updateManualPreview(root, rover) {
        const preview = root?.querySelector('[data-role="manual-preview"]');
        const select = root?.querySelector('[data-role="manual-select"]');

        if (!preview || !select) {
            return;
        }

        const eventId = clean(select.value);
        const candidate = uiState.manualCandidates.get(eventId);

        preview.innerHTML = `
            <div class="rs-cbb-rover-line">
                <strong>ROVER:</strong> ${teamLine(rover)} · #${escapeHtml(rover.roverEventId)}
            </div>
            <div class="rs-cbb-espn-line">
                <strong>VINCULAR MANUALMENTE CON:</strong> ${escapeHtml(manualCandidateLabel(candidate))}
            </div>
        `;
    }

    function renderManual(root, rover, override) {
        const label = manualOverrideEventText(override);
        root.innerHTML = compactLinkRow({
            mode: "MANUAL",
            fieldClass: "rs-cbb-field-manual",
            fieldText: escapeHtml(label),
            title: `Override manual para Rover #${rover.roverEventId}` +
                `${override.source ? ` · ${override.source}` : ""}`
        });
    }

    function renderDisabled(root, rover) {
        root.innerHTML = compactLinkRow({
            mode: "OFF",
            fieldClass: "rs-cbb-field-disabled",
            fieldText: `AUTO desactivado — ${teamLine(rover)}`,
            title: `Rover #${rover.roverEventId} · Clic para vincular manualmente`,
            rightAction: "auto"
        });
    }

    async function renderCurrent({ useCache = true } = {}) {
        const seq = ++uiState.renderSeq;

        if (!isCBBView()) {
            removeUi();
            return null;
        }

        if (contextGate.dirty) {
            removeUi();
            return {
                valid: false,
                reason: "filters_pending_search"
            };
        }

        const editorId =
            getEditorEventId();

        if (
            editorId &&
            !editorBelongsToCurrentEventList(editorId)
        ) {
            removeUi();
            return {
                valid: false,
                reason: "editor_not_in_current_event_list",
                roverEventId: editorId
            };
        }

        const rover = await waitForCurrentRoverEvent(3000);
        if (!rover?.valid) {
            if (uiStillCurrent(seq, rover?.roverEventId || "")) {
                removeUi();
            }
            return rover;
        }

        if (!uiStillCurrent(seq, rover.roverEventId)) {
            return null;
        }

        const root = ensureUiRoot(rover.roverEventId);
        if (!root) {
            return null;
        }

        clearTimeout(uiState.pendingSafetyTimer);
        uiState.pendingSafetyTimer = 0;
        setUiBusy(root, false);

        const override = getOverride(rover.roverEventId);

        if (override?.mode === "disabled") {
            delete root.dataset.pendingEventId;
            renderDisabled(root, rover);
            return { mode: "disabled", rover, override };
        }

        if (override?.mode === "manual") {
            delete root.dataset.pendingEventId;
            renderManual(root, rover, override);
            void warmFoxLink(rover);
            return { mode: "manual", rover, override };
        }

        /*
         * Si ya visitamos este evento y la firma Rover no cambió,
         * presentamos el vínculo inmediatamente. No hay transición
         * "Buscando..." ni red para reconstruir el linker.
         */
        const cachedLink = getActiveAutoLink(rover);

        if (cachedLink) {
            const cachedResult = {
                ESPN_EVENT_ID: cachedLink.espnEventId,
                ESPN_EVENT: "",
                FUENTE: cachedLink.source,
                ESTADO:
                    cachedLink.pairOrder === "REVERSED"
                        ? "REVERSED_PAIR"
                        : (cachedLink.status || "EXACT"),
                ORDEN:
                    cachedLink.pairOrder === "REVERSED"
                        ? "INVERTIDO"
                        : "NORMAL"
            };

            delete root.dataset.pendingEventId;
            renderAutoResult(root, rover, cachedResult);
            void warmFoxLink(rover);

            return {
                mode: "auto-cache",
                rover,
                result: cachedResult
            };
        }

        renderAutoLoading(root, rover);

        const result = await resolveRoverAutoShared(
            rover,
            {
                useCache,
                scheduleFallback: true
            }
        );

        if (!uiStillCurrent(seq, rover.roverEventId)) {
            return null;
        }

        expose("__ESPN_CBB_LAST_MATCH", result);

        if (
            acceptedAutoLinkStatus(result?.ESTADO) &&
            result?.ESPN_EVENT_ID
        ) {
            setActiveAutoLink(rover, result);
            void warmFoxLink(rover);
        } else {
            invalidateActiveLink(rover.roverEventId);
        }

        delete root.dataset.pendingEventId;
        renderAutoResult(root, rover, result);
        return { mode: "auto", rover, result };
    }

    function renderManualSearchPanel(root, rover, candidates) {
        root.querySelector(".rs-cbb-manual-panel")?.remove();
        uiState.manualCandidates.clear();

        for (const event of candidates) {
            uiState.manualCandidates.set(String(event.eventId), event);
        }

        const panel = document.createElement("div");
        panel.className = "rs-cbb-manual-panel";

        const options = candidates.length
            ? candidates.map(event => {
                const scorePrefix = event.manualScore >= 100
                    ? "★ "
                    : event.manualScore >= 20
                        ? "• "
                        : "";
                const time = eventTimeEt(event.date);
                const label = `${scorePrefix}${event.away} @ ${event.home}` +
                    `${time ? ` — ${time} ET` : ""} — ESPN #${event.eventId}`;
                return `<option value="${escapeHtml(event.eventId)}">${escapeHtml(label)}</option>`;
            }).join("")
            : `<option value="">No se encontraron candidatos en ESPN</option>`;

        panel.innerHTML = `
            <div><strong>Vinculación manual</strong></div>
            <div class="rs-cbb-meta">
                Se muestran eventos ESPN de ${escapeHtml(rover.date)}. MANUAL queda bloqueado y siempre tiene prioridad sobre AUTO hasta pulsar AUTO.
            </div>
            <div class="rs-cbb-manual-row">
                <select data-role="manual-select">${options}</select>
                <button class="rs-cbb-primary" data-espn-action="manual-save" ${candidates.length ? "" : "disabled"}>Vincular seleccionado</button>
            </div>
            <div class="rs-cbb-manual-preview" data-role="manual-preview"></div>
            <div class="rs-cbb-manual-row">
                <input data-role="manual-id" inputmode="numeric" placeholder="ESPN Event ID">
                <button data-espn-action="manual-id-save">Vincular ID</button>
                <button data-espn-action="manual-cancel">Cancelar</button>
            </div>
        `;

        root.appendChild(panel);
        updateManualPreview(root, rover);
    }

    async function openManualSearch(root, rover) {
        const existing = root.querySelector(".rs-cbb-manual-panel");
        if (existing) {
            existing.remove();
        }

        const loading = document.createElement("div");
        loading.className = "rs-cbb-manual-panel";
        loading.innerHTML = `<div class="rs-cbb-meta">Buscando candidatos ESPN...</div>`;
        root.appendChild(loading);

        const selectedId = rover.roverEventId;
        const candidates = await getManualCandidates(rover, { useCache: true });

        const current = getCurrentRoverEvent();
        if (!current?.valid || current.roverEventId !== selectedId || !isCBBView()) {
            return;
        }

        const currentRoot = getUiRoot();
        if (!currentRoot || currentRoot.dataset.roverEventId !== selectedId) {
            return;
        }

        renderManualSearchPanel(currentRoot, rover, candidates);
    }

    async function onUiClick(event) {
        const button = event.target.closest("[data-espn-action]");
        if (!button) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.espnAction;
        const root = getUiRoot();
        const rover = getCurrentRoverEvent();

        if (!root || !rover?.valid || root.dataset.roverEventId !== rover.roverEventId) {
            return;
        }

        if (action === "open-espn") {
            const eventId = clean(button.dataset.espnEventId);
            const url = espnGameUrl(eventId);

            if (!url) {
                console.warn(`${TAG} ESPN Event ID inválido para abrir: ${eventId}`);
                return;
            }

            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );

            return;
        }

        if (action === "update-result") {
            /*
             * Feedback visual instantáneo antes de cualquier I/O.
             */
            setResultNotice(root, {
                className: "is-pre",
                text: "Actualizando resultado…"
            });

            setUiBusy(root, true);

            try {
                const update = await updateLinkedResult({
                    rover,
                    requestedContextToken:
                        contextGate.watchToken
                });

                if (
                    update?.ok &&
                    update?.applied &&
                    getUiRoot() === root &&
                    root.dataset.roverEventId ===
                        update.game?.roverEventId
                ) {
                    /*
                     * The result badge already shows the canonical
                     * game state. Keep ↻ unchanged to avoid a second,
                     * redundant success indicator.
                     */
                }
            } finally {
                if (getUiRoot() === root &&
                    root.dataset.roverEventId === rover.roverEventId) {
                    setUiBusy(root, false);
                }
            }

            return;
        }

        if (action === "unlink") {
            setDisabled(rover.roverEventId);
            await renderCurrent();
            return;
        }

        if (action === "auto") {
            removeOverride(rover.roverEventId);
            invalidateActiveLink(rover.roverEventId);
            await renderCurrent();
            return;
        }

        if (action === "manual-search") {
            setUiBusy(root, true);
            try {
                await openManualSearch(root, rover);
            } finally {
                const currentRoot = getUiRoot();
                if (currentRoot) {
                    setUiBusy(currentRoot, false);
                }
            }
            return;
        }

        if (action === "manual-cancel") {
            root.querySelector(".rs-cbb-manual-panel")?.remove();
            return;
        }

        if (action === "manual-save") {
            const select = root.querySelector('[data-role="manual-select"]');
            const eventId = clean(select?.value);
            const candidate = uiState.manualCandidates.get(eventId);

            if (!candidate) {
                console.warn(`${TAG} Candidato manual no disponible.`);
                return;
            }

            const saved = setManualOverride(rover.roverEventId, candidate);
            const stored = getOverride(rover.roverEventId);

            if (
                !saved ||
                stored?.mode !== "manual" ||
                String(stored?.espnEventId || "") !== eventId
            ) {
                console.error(
                    `${TAG} No se pudo fijar el override manual para Rover #${rover.roverEventId}.`
                );
                return;
            }

            console.log(
                `${TAG} MANUAL fijado: Rover #${rover.roverEventId} -> ESPN #${eventId} (${candidate.away} @ ${candidate.home})`
            );

            await renderCurrent();
            return;
        }

        if (action === "manual-id-save") {
            const input = root.querySelector('[data-role="manual-id"]');
            const eventId = clean(input?.value);

            if (!/^\d+$/.test(eventId)) {
                input?.focus();
                console.warn(`${TAG} Escribe un ESPN Event ID numérico.`);
                return;
            }

            const knownCandidate = uiState.manualCandidates.get(eventId);

            const saved = setManualOverride(
                rover.roverEventId,
                knownCandidate || {
                    eventId,
                    name: `ESPN Event #${eventId}`,
                    source: "MANUAL_ID"
                }
            );

            const stored = getOverride(rover.roverEventId);

            if (
                !saved ||
                stored?.mode !== "manual" ||
                String(stored?.espnEventId || "") !== eventId
            ) {                console.error(
                    `${TAG} No se pudo fijar manualmente ESPN #${eventId} para Rover #${rover.roverEventId}.`
                );
                return;
            }

            console.log(
                `${TAG} MANUAL_ID fijado: Rover #${rover.roverEventId} -> ESPN #${eventId}`
            );

            await renderCurrent();
        }
    }

    // ============================================================
    // MOD 19 - CICLO DE VIDA / OBSERVERS
    // ============================================================

    function getContextFilterSignature() {
        const category = getSelected(
            getContextSelect("CATEGORY")
        );
        const league = getSelected(
            getContextSelect("LEAGUE")
        );

        const dateInput = getDateInput();

        const dateValue = clean(dateInput?.value || "");

        return [
            category.value || category.text,
            league.value || league.text,
            dateValue
        ].join("|");
    }

    function isContextFilterControl(target) {
        if (!target) {
            return false;
        }

        return (
            target === getContextSelect("CATEGORY") ||
            target === getContextSelect("LEAGUE") ||
            target === getDateInput()
        );
    }


    function getEventListFingerprint() {
        const root = getEventListRoot();

        if (!root) {
            return "NO_TABLE";
        }

        const rows = getEventRows();

        if (!rows.length) {
            return "EMPTY";
        }

        return rows.map(row => {
            const id = parseEventIdFromRow(row);

            const cells = [...row.querySelectorAll("td")]
                .map(td => clean(td.innerText))
                .join("~");

            return `${id}:${cells}`;
        }).join("||");
    }


    function getEventListCbbValidation() {
        const root = getEventListRoot();

        if (!root) {
            return {
                usable: false,
                reason: "NO_TABLE",
                totalRows: 0,
                parsedRows: 0,
                mappedPairs: 0,
                ratio: 0
            };
        }

        const rows = getEventRows();

        if (!rows.length) {
            return {
                usable: false,
                reason: "EMPTY",
                totalRows: 0,
                parsedRows: 0,
                mappedPairs: 0,
                ratio: 0
            };
        }

        let parsedRows = 0;
        let mappedPairs = 0;

        for (const row of rows) {
            const parsed = parseRoverRow(row);

            if (!parsed) {
                continue;
            }

            parsedRows += 1;

            if (
                getTeamMap(parsed.away?.roverCode)?.espn_id &&
                getTeamMap(parsed.home?.roverCode)?.espn_id
            ) {
                mappedPairs += 1;
            }
        }

        const ratio = parsedRows ? mappedPairs / parsedRows : 0;

        const editorId =
            getEditorEventId({
                requireReady: false
            });

        const editorRow =
            editorId
                ? findEventRow(editorId)
                : null;

        const parsedEditor =
            editorRow
                ? parseRoverRow(editorRow)
                : null;

        const editorMapped = Boolean(
            parsedEditor?.validIdentity &&
            getTeamMap(parsedEditor.away.roverCode)?.espn_id &&
            getTeamMap(parsedEditor.home.roverCode)?.espn_id
        );

        const usable =
            parsedRows > 0 &&
            mappedPairs > 0 &&
            (
                ratio >= 0.80 ||
                editorMapped ||
                (mappedPairs >= 2 && ratio >= 0.50)
            );

        return {
            usable,
            reason:
                usable
                    ? "CBB_TABLE_CONFIRMED"
                    : "NOT_CBB_LIKE",
            totalRows: rows.length,
            parsedRows,
            mappedPairs,
            ratio,
            view: getRoverViewKind()
        };
    }


    function getCachedEventListCbbValidation() {
        const table = getEventListRoot();

        if (table !== uiState.observedTable) {
            uiState.tableObserver?.disconnect();
            uiState.observedTable = table;
            uiState.tableValidation = null;

            if (
                table &&
                typeof MutationObserver === "function"
            ) {
                uiState.tableObserver =
                    new MutationObserver(() => {
                        uiState.tableValidation = null;
                        scheduleSyncActivation(0);
                    });

                uiState.tableObserver.observe(table, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true,
                    attributeFilter: [
                        "tkt",
                        "data-content",
                        "id",
                        "class",
                        "onclick",
                        "data-evento",
                        "data-event-id"
                    ]
                });
            }
        }

        const editorId =
            getEditorEventId({
                requireReady: false
            });

        if (
            !uiState.tableValidation ||
            uiState.tableValidationEditorId !== editorId
        ) {
            uiState.tableValidation =
                getEventListCbbValidation();

            uiState.tableValidationEditorId =
                editorId;
        }

        return uiState.tableValidation;
    }


    function tryConfirmFreshContext(source = "AUTO") {
        if (
            !contextGate.dirty ||
            !isCBBView()
        ) {
            return !contextGate.dirty;
        }

        const currentFingerprint = getEventListFingerprint();
        const currentRows = getEventRows();
        const rowsReplaced = contextGate.staleRows.length > 0 &&
            currentRows.length > 0 &&
            currentRows.some((row, index) => row !== contextGate.staleRows[index]);

        /*
         * El primer Search puede llegar por AJAX sin pasar por nuestro
         * detector de click. Aceptamos el refresh observable de la tabla,
         * siempre que su contenido confirme equipos CBB; una tabla vieja
         * con las mismas filas y el mismo contenido sigue bloqueada.
         */
        if (
            !currentFingerprint ||
            currentFingerprint === "NO_TABLE" ||
            currentFingerprint === "EMPTY" ||
            (currentFingerprint === contextGate.staleFingerprint && !rowsReplaced)
        ) {
            return false;
        }

        const validation =
            getEventListCbbValidation();

        if (!validation.usable) {
            return false;
        }

        console.log(
            `${TAG} Tabla CBB detectada automáticamente (${source}): ` +
            `${validation.mappedPairs}/${validation.parsedRows} pares mapeados.`
        );

        markContextFresh();
        return true;
    }

    function editorBelongsToCurrentEventList(editorId) {
        const id = String(editorId || "").trim();
        return Boolean(id && findEventRow(id));
    }


    function isMainFilterSearchControl(target) {
        const control = target?.closest?.(
            'button, input[type="button"], input[type="submit"], a'
        );

        if (!control) {
            return false;
        }

        const editor = getEditorContainer();

        if (editor?.contains(control)) {
            return false;
        }

        if (control.id === "rv2_searchBtn") {
            return true;
        }

        const label = upper(
            control.value ||
            control.textContent ||
            ""
        );

        return label === "SEARCH" || label === "BUSCAR";
    }


    function markContextDirty(reason = "FILTER_CHANGED") {
        contextGate.dirty = true;
        contextGate.searchRequested = false;
        contextGate.staleFingerprint = getEventListFingerprint();
        contextGate.staleRows = getEventRows();
        contextGate.watchToken += 1;

        uiState.renderSeq += 1;
        uiState.lastEditorId = "";
        clearTimeout(uiState.renderTimer);
        removeUi();

        console.log(
            `${TAG} Contexto pendiente de Search (${reason}). ` +
            `No se consultará ESPN hasta refrescar la tabla.`
        );
    }

    function markContextFresh() {
        contextGate.dirty = false;
        contextGate.searchRequested = false;
        contextGate.staleFingerprint = getEventListFingerprint();
        contextGate.staleRows = [];
        uiState.tableValidation = null;
        uiState.lastEditorId = "";

        console.log(
            `${TAG} Tabla refrescada para ${getContextFilterSignature()}.`
        );

        syncActivation();
    }

    function watchForSearchRefresh(token) {
        const startedAt = Date.now();

        const check = () => {
            if (
                token !== contextGate.watchToken ||
                !contextGate.dirty ||
                !contextGate.searchRequested
            ) {
                return;
            }

            if (tryConfirmFreshContext("SEARCH_WATCH")) {
                return;
            }

            if (Date.now() - startedAt < 5000) {
                setTimeout(check, 50);
                return;
            }

            console.warn(
                `${TAG} Search no produjo un cambio detectable en la lista de eventos. ` +
                `El script seguirá en espera para evitar usar eventos de otra liga.`
            );
        };

        setTimeout(check, 50);
    }

    function scheduleSyncActivation(
        delay = 0
    ) {
        clearTimeout(
            uiState.syncTimer
        );

        uiState.syncTimer =
            setTimeout(
                syncActivation,
                delay
            );
    }

    function roverShellNode(node) {
        if (
            !node ||
            node.nodeType !== 1
        ) {
            return false;
        }

        return Boolean(
            node.matches?.(
                "#tablaEventos, #resEditContainer, #rv2_listContainer, #rv2_editor"
            ) ||
            node.querySelector?.(
                "#tablaEventos, #resEditContainer, #rv2_listContainer, #rv2_editor"
            )
        );
    }

    function attachPageObserver() {
        if (
            uiState.pageObserver ||
            typeof MutationObserver !==
                "function" ||
            !document.documentElement
        ) {
            return;
        }

        uiState.pageObserver =
            new MutationObserver(
                records => {
                    const relevant =
                        records.some(
                            record =>
                                [
                                    ...record.addedNodes,
                                    ...record.removedNodes
                                ].some(
                                    roverShellNode
                                )
                        );

                    if (relevant) {
                        scheduleSyncActivation(
                            0
                        );
                    }
                }
            );

        uiState.pageObserver.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );
    }

    function scheduleRender(delay = 0) {
        clearTimeout(uiState.renderTimer);
        uiState.renderTimer = setTimeout(() => {
            renderCurrent().catch(error => {
                console.error(`${TAG} UI render error`, error);
            });
        }, delay);
    }


    function attachContainerObserver() {
        const container = getEditorContainer();

        if (!container || container === uiState.observedContainer) {
            return;
        }

        uiState.containerObserver?.disconnect();
        uiState.observedContainer = container;

        uiState.containerObserver =
            new MutationObserver(() => {
                if (!isCBBView() || contextGate.dirty) {
                    uiState.renderSeq += 1;
                    removeUi();
                    return;
                }

                const editorId = getEditorEventId();

                if (!editorId) {
                    return;
                }

                const root = getUiRoot();

                if (
                    editorId !== uiState.lastEditorId ||
                    root?.dataset.roverEventId !== editorId ||
                    root?.dataset.pendingEventId === editorId ||
                    !root
                ) {
                    uiState.lastEditorId = editorId;
                    scheduleRender(0);
                }
            });

        uiState.containerObserver.observe(container, {
            childList: true,
            subtree: true
        });
    }


    function syncActivation() {
        attachContainerObserver();
        const selectedCBB = isCBBView();

        if (!selectedCBB) {
            if (uiState.active || getUiRoot()) {
                uiState.active = false;
                uiState.renderSeq += 1;
                uiState.lastEditorId = "";
                removeUi();
            }
            return;
        }

        /*
         * No dependemos del evento click de Search. Si Rover ya sustituyó
         * la tabla vieja por una tabla que realmente parece CBB, liberamos
         * el contexto automáticamente.
         */
        if (
            contextGate.dirty &&
            !tryConfirmFreshContext("SYNC")
        ) {
            if (uiState.active || getUiRoot()) {
                uiState.active = false;
                uiState.renderSeq += 1;
                uiState.lastEditorId = "";
                removeUi();
            }
            return;
        }

        /*
         * Segunda barrera: incluso con dirty=false (por ejemplo tras instalar
         * o recargar el userscript), jamás mostrar la UI CBB encima de una
         * tabla que no tenga apariencia CBB. Esto bloquea NBA/IBB stale.
         */
        const tableValidation = getCachedEventListCbbValidation();

        if (!tableValidation.usable) {
            if (uiState.active || getUiRoot()) {
                uiState.active = false;
                uiState.renderSeq += 1;
                uiState.lastEditorId = "";
                removeUi();
            }
            return;
        }

        const editorId =
            getEditorEventId({
                requireReady: false
            });

        /*
         * Después de Search, Rover puede conservar momentáneamente el editor
         * de la liga anterior. No activamos CBB hasta que ese Event ID exista
         * también en la tabla recién refrescada.
         */
        if (
            editorId &&
            !editorBelongsToCurrentEventList(editorId)
        ) {
            uiState.active = false;
            uiState.lastEditorId = "";
            removeUi();
            return;
        }

        if (!uiState.active) {
            uiState.active = true;
            uiState.lastEditorId = editorId;

            if (editorId) {
                scheduleRender(0);
            }
            return;
        }

        if (editorId && editorId !== uiState.lastEditorId) {
            uiState.lastEditorId = editorId;
            scheduleRender(0);
        }
    }

    function initUi() {
        installStyles();

        contextGate.signature =
            getContextFilterSignature();

        attachContainerObserver();
        attachPageObserver();

        /*
         * Captura el click ANTES de que ticketSelected() haga su AJAX.
         * La barra persistente cambia inmediatamente al nuevo evento.
         */
        document.addEventListener("click", event => {
            if (isMainFilterSearchControl(event.target)) {
                if (
                    contextGate.dirty &&
                    isCBBView()
                ) {
                    contextGate.searchRequested = true;
                    const token = ++contextGate.watchToken;

                    console.log(
                        `${TAG} Search detectado; esperando tabla CBB actualizada...`
                    );

                    watchForSearchRefresh(token);
                }
                return;
            }

            const row = event.target?.closest?.(
                "#tablaEventos tr[tkt], #rv2_listContainer tr.rv2-event-row"
            );

            if (!row || !isCBBView()) {
                return;
            }

            if (
                contextGate.dirty &&
                !tryConfirmFreshContext("EVENT_ROW_CLICK")
            ) {
                return;
            }

            renderPendingSelection(row);
            void prewarmSelectedRoverRow(
                row
            );
        }, true);

        document.addEventListener("change", event => {
            const target = event.target;

            if (
                target?.matches?.('[data-role="manual-select"]') &&
                target.closest?.(`#${UI_ID}`)
            ) {
                const root = getUiRoot();
                const rover = getCurrentRoverEvent();

                if (
                    root &&
                    rover?.valid &&
                    root.dataset.roverEventId === rover.roverEventId
                ) {
                    updateManualPreview(root, rover);
                }
                return;
            }

            if (isContextFilterControl(target)) {
                /*
                 * Cualquier change real de CATEGORY/LEAGUE/DATE invalida la
                 * tabla actual. No dependemos de comparar con una firma vieja,
                 * porque Rover puede haber pasado por otra liga entre medias.
                 */
                contextGate.signature =
                    getContextFilterSignature();

                markContextDirty(
                    "CATEGORY/LEAGUE/DATE_CHANGED"
                );

                scheduleSyncActivation(0);
            }
        }, true);

        /*
         * Normal operation is event-driven. This slow watchdog is only a
         * defensive fallback for unusual Rover DOM updates.
         */
        uiState.pollTimer =
            setInterval(
                syncActivation,
                5000
            );

        setTimeout(
            syncActivation,
            50
        );
    }

    // ============================================================
    // API CONSOLA
    // ============================================================

    const API = {
        version: VERSION,
        getRoverViewKind,
        getEditorContainer,
        getEditorEventId,
        getRv2IdentityState,
        getRv2WindowEventId,
        getRv2SelectedRowEventId,
        getRv2EditorHiddenEventId,
        getEventListRoot,
        isCBBView,
        getContext,
        getIsoDate,
        getCurrentRoverEvent,
        getRoverEvents,
        getTeamMap,
        mapStats,
        clearCache,
        normalizeEspnRequestUrl,
        diagHttp,
        getContextGate: () => ({
            ...contextGate,
            currentSignature: getContextFilterSignature(),
            currentFingerprint: getEventListFingerprint(),
            cbbTableValidation: getEventListCbbValidation()
        }),
        clearOverrides,
        getOverride,
        getActiveAutoLink,
        promoteActiveLinkGameState,
        invalidateActiveLink,
        setDisabled,
        setManual: (roverEventId, espnEventId) =>
            setManualOverride(roverEventId, {
                eventId: espnEventId,
                name: `ESPN Event #${espnEventId}`,
                source: "MANUAL_CONSOLE"
            }),
        useAuto: roverEventId => removeOverride(roverEventId),
        getManualCandidates,
        resolve,
        resolveRoverAutoShared,
        prewarmSelectedRoverRow,
        scanAll,
        getActiveEspnLink,
        fetchGameSummary,
        readGame,
        readGameFresh,
        verifyFoxResult,
        resolveFoxGame,
        warmFoxLink,
        getCachedFoxLinkForRover,
        fetchFoxEvent,
        fetchFoxTeamGamelog,
        fetchFoxTeamScheduleMain,
        fetchFoxTeamScheduleSegment,
        getFoxScheduleEventIds,
        findFoxEventFromTeamSchedule,
        diagHalftime,
        diagPerformance,
        getLastUpdateTiming:
            () => lastUpdateTiming,
        updateLinkedResult,
        render: renderCurrent
    };

    expose("__CBB_ESPN_FOX", API);
    expose("__CBB_FOX", API);
    expose("__ESPN_CBB", API);

    initUi();

    setTimeout(() => {
        if (!isCBBView()) {
            return;
        }

        console.log(`${TAG} v${VERSION} activo en BASKETBALL > CBB.`);
    }, 500);
})();
