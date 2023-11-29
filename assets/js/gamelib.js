$(document).ready(function() {
    // Game data stored as an array of objects
    var gamesData = [
        {
            title: "Monster Hunter: World",
            description: "Builds and Guides.",
            tags: ["MHW", "Monster Hunter"],
            link: "/landing-pages/mhw",
            // Add more properties for each game as needed
        },
        {
            title: "Monster Hunter: Rise",
            description: "Builds and Guides.",
            tags: ["MHR", "Monster Hunter"],
            link: "/landing-pages/mhr",
            // Add more properties for each game as needed
        },
        {
            title: "Starfield",
            description: "A collection of Game Tools and Trackers for Starfield.",
            tags: ["Sf",],
            link: "/landing-pages/starfield"
        },
        {
            title: "Palia",
            description: "A few tools for Palia i made that made play easier.",
            tags: ["Pal",],
            link: "/landing-pages/palia"
        },
        {
            title: "Diablo 4",
            description: "Currently contains a Paragon Tracker tool.",
            tags: ["D4",],
            link: "/landing-pages/diablo4/"
        },
        {
            title: "Melvor Idle",
            description: "Tools and helpers for Melvor Idle.",
            tags: ["MI",],
            link: "/landing-pages/melvor"
        },
        {
            title: "Vampire Survivors",
            description: "Builds and Guides for Vampire Survivors.",
            tags: ["VS",],
            link: "/landing-pages/vampiresurvivors"
        },
        {
            title: "Grounded",
            description: "All Grounded related pages.",
            tags: ["gd",],
            link: "/landing-pages/grounded"
        },
        {
            title: "Valheim",
            description: "All Valheim related pages.",
            tags: ["VS",],
            link: "/landing-pages/valheim"
        }
        // Add other game objects in a similar format
    ];

    var gameCardsContainer = $('#gameCardsContainer');

    // Function to generate game cards
    function generateGameCards(data) {
        gameCardsContainer.empty();

        data.forEach(function(game) {
            var card = $('<div class="col-sm-2 col-md-4 col-lg-3">' +
                '<div class="card text-white bg-dark">' +
                '<div class="card-body">' +
                '<h2 class="card-title">' + game.title + '</h2>' +
                '<p class="card-text">' + game.description + '</p>' +
                '<a href="' + game.link + '" class="btn btn-primary">View Game</a>' +
                '</div></div></div>');

            gameCardsContainer.append(card);
        });
    }

    generateGameCards(gamesData);

    $('#searchInput').on('input', function() {
        var searchText = $(this).val().toLowerCase();

        gamesData.forEach(function(game) {
            var card = gameCardsContainer.find('.card:contains(' + game.title + ')');

            if (game.title.toLowerCase().includes(searchText) || game.tags.some(tag => tag.toLowerCase().includes(searchText))) {
                card.parent().show();
            } else {
                card.parent().hide();
            }
        });
    });
});