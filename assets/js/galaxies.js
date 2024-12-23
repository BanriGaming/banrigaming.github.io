$(document).ready(function () {
    let table;

    // Load and parse the CSV file
    Papa.parse("https://banrigaming.github.io/assets/files/nmsgalaxies.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            const tableBody = $('#galaxiesTable tbody');

            // Populate table rows
            results.data.forEach(row => {
                // Skip rows with missing critical fields (galaxy or type)
                if (!row.galaxy || !row.type) {
                    return; // Continue to the next iteration
                }

                const num = row.num || "N/A";
                const galaxy = row.galaxy;
                const type = row.type;
                const access = row.access || "no";

                // Assign classes based on the type for styling purposes
                const galaxyClass = type.toLowerCase(); // Use CSS classes like .lush, .harsh, etc.
                const accessIcon = access.toLowerCase() === "yes" 
                    ? '<span class="checkmark">&#10003;</span>' 
                    : '<span class="text-danger">&#10007;</span>';

                // Build a new row
                const newRow = `
                    <tr class="access-${access.toLowerCase()}">
                        <td>${num}</td>
                        <td class="${galaxyClass}">${galaxy}</td>
                        <td>${type}</td>
                        <td>${accessIcon}</td>
                    </tr>
                `;
                tableBody.append(newRow);
            });

            // Initialize DataTable
            table = $('#galaxiesTable').DataTable({
                paging: true,
                searching: true,
                ordering: true,
                pageLength: 10,
                lengthMenu: [10, 25, 50, 100],
                responsive: true // Enable the responsive feature
            });

            // Event handler for the access filter
            $('#accessFilter').on('change', function () {
                const accessFilterValue = $(this).val();

                // Show rows based on the filter (by Access)
                table.rows().every(function () {
                    const row = this.node();
                    if (accessFilterValue === "" || $(row).hasClass(`access-${accessFilterValue}`)) {
                        $(row).show();
                    } else {
                        $(row).hide();
                    }
                });
            });
        },
        error: function (err) {
            console.error("Error loading the CSV:", err);
        }
    });
});