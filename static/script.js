document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".flash").forEach((message) => {
    message.addEventListener("click", () => {
      message.remove();
    });
  });
});
// Add this list to your script block in edit_profile.html
const bannedKeywords = ["iplogger", "grabify", "2no.co", "yip.su", "pornhub", "xvideos", "xnxx", "stripchat"];

function containsMaliciousLink(url) {
    const lowerUrl = url.toLowerCase();
    return bannedKeywords.some(keyword => lowerUrl.includes(keyword));
}

// Inside your form submit event or validation check:
document.querySelector('form').addEventListener('submit', function(e) {
    const inputs = document.querySelectorAll('input[type="url"], input.custom-link-input');
    for (let input of inputs) {
        if (input.value && containsMaliciousLink(input.value)) {
            e.preventDefault();
            alert("Blocked: This link contains a restricted domain (IP grabbers or adult content are not allowed).");
            input.focus();
            return false;
        }
    }
});