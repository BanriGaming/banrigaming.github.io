
function calculateRunes(){
    document.getElementById("showdata").style.display="block";
    var cast = document.getElementById("cast").value; //Number of casts
    var magic = document.getElementById("magic").value; //Magic title
    var main_div = document.getElementById("showdata");
    //Parse json file
    $.getJSON("https://banrigaming.github.io/assets/json/runes.json", function(json) {
        calc(json); // this will show the info it in firebug console
    });
    function calc(json){
        console.log(json.runes.length);
        for(i=0 ; i<json.runes.length ; i++){
            if(magic == json.runes[i].title){
                console.log("here");
                const node = document.createElement("p");
                const textnode = document.createTextNode("Water");
                node.appendChild(textnode);
                main_div.appendChild(node);
                console.log(json.runes[i].combination);
                var text="";
               /* for (const x in json.runes[i].combination) {
                    text += json.runes[i].combination[x] + ", ";
                    console.log(x);
                    console.log(json.runes[i].combination[x]);
                }*/
                console.log(text);
                for (var key in json.runes[i].combination) {
                    console.log(key);
                    console.log(json.runes[i].combination[key]);
                }
            }
        }
    }

    
}