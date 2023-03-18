
function cleardata(){ 
    document.getElementById("title").innerHTML = "";
    document.getElementById("category").innerHTML = "";
    document.getElementById("level").innerHTML = "";
    document.getElementById("runes").innerHTML="";
    document.getElementById("c_runes").innerHTML="";
    document.getElementsByTagName("h2").innerHTML="";
    document.getElementsByTagName("h3").innerHTML="";
}
function calculateRunes(){
    cleardata();
    document.getElementById("showdata").style.display="block";  
    var cast = document.getElementById("cast").value; //Number of casts
    var magic = document.getElementById("magic").value; //Magic title
    var main_div = document.getElementById("showdata");
    var rune_node = document.getElementById("runes");
    var c_rune_node = document.getElementById("c_runes");
    //Parse json file
    $.getJSON("https://banrigaming.github.io/assets/json/runes.json", function(json) {
        calc(json); // this will show the info it in firebug console
    });
    function calc(json){
        for(i=0 ; i<json.runes.length ; i++){
            if(magic == json.runes[i].title){
                document.getElementById("title").innerHTML = json.runes[i].title;
                document.getElementById("category").innerHTML = "Category: "+ json.runes[i].type;
                document.getElementById("level").innerHTML = "Level: "+json.runes[i].level;
                for (var key in json.runes[i].standard) {
                    const rune_text = document.createTextNode(key.charAt(0).toUpperCase()+key.slice(1)+" Runes: ");
                    const total_text = document.createTextNode(json.runes[i].standard[key]*cast+" ");
                    rune_node.appendChild(rune_text);
                    rune_node.appendChild(total_text);
                    main_div.appendChild(rune_node);
                }
                console.log(json.runes[i].options);
                if(json.runes[i].options === true){ //for combination
                    c_rune_node.style.display="block"; 
                    for (var key in json.runes[i].combination) {
                        const rune_text = document.createTextNode(key.charAt(0).toUpperCase()+key.slice(1)+" Runes: ");
                        const total_text = document.createTextNode(json.runes[i].combination[key]*cast+" ");
                        c_rune_node.appendChild(rune_text);
                        c_rune_node.appendChild(total_text);
                        main_div.appendChild(c_rune_node);
                    }
                }else{
                    //c_rune_node.style.display="none";
                }
                
            }
        }
    }
    //document.getElementById("showdata").innerHTML="";
    
}