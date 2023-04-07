window.onload = (event) => {
    $.getJSON("https://banrigaming.github.io/assets/json/mhrskills.json", function (json) {
        tooltip(json); // this will show the info it in firebug console
    });
};
function tooltip(json) {
    var t_span = document.getElementsByClassName("c_tooltip");
    for (var i = 0; i < t_span.length; i++) { //iterate through all the tooltips in HTML
        for (var j = 0; j < json.skills.length; j++) { //iterate through json
            if (t_span[i].innerText === json.skills[j].title) { //find skill
                var parent_a = t_span[i].parentNode;
                var content = "<div class='fs-6'><strong>"+json.skills[j].title+"</strong><hr></div><div class='fs-6'><p>" + json.skills[j].desc + ".</p>";
                var counter = 1;
                for (var key in json.skills[j]) {
                    if (key !== "desc" && key !== "title") {
                        content = content + "<p><strong>Level " + (counter++) + ": </strong>" + json.skills[j][key] + ".</p>";
                    }
                }
                content = content + "</p></div>";
                console.log(content);
                parent_a.setAttribute("data-bs-content", content);               
            }
        }
    }
}

var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl)
})
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})
var popover = new bootstrap.Popover(document.querySelector('.popover-dismiss'), {
    trigger: 'focus'
})