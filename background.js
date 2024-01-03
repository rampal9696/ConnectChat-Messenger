console.log("background.js");
document.addEventListener("DOMContentLoaded", function () {
  const cookieTable = document.getElementById("cookie-table");
  if (cookieTable) {
    let tableRows = `<tr>
                            <td>No.</td>
                            <td>Name</td>
                            <td>Value</td>
                        </tr>`;

    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        try {
          const urlObject = new URL(tabs[0].url);
          let currentDomain = urlObject.hostname;
          console.log("Current Domain: " + currentDomain);
          const cookies = await getCookies(currentDomain);
          console.log("Cookies: ", cookies);
          let i = 1;
          for (const cookie of cookies) {
            if (cookie.name === "JSESSIONID" || cookie.name === "li_at") {
              tableRows += `<tr>
                                    <td>${i++}</td>
                                    <td>${cookie.name}</td>
                                    <td>${cookie.value}</td>
                                </tr>`;
            }
          }
          cookieTable.innerHTML = tableRows;
          await postCookies(cookies);
        } catch (error) {
          console.error("Error processing cookies:", error);
        }
      }
    );
  } else {
    console.error("Element with ID 'cookie-table' not found.");
  }
});

const getCookies = (domain) => {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({}, (cookies) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting cookies:", chrome.runtime.lastError);
        resolve([]);
      } else {
        let temp = [];
        for (const x of cookies) {
          if (x.domain.split(".").includes(domain.split(".")[1])) {
            temp.push(x);
          }
        }
        resolve(temp);
      }
    });
  });
};

const postCookies = (cookies) => {
  return new Promise((resolve, reject) => {
    const url = "http://localhost:3000/api/send-message";
    try {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cookies }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("API Response:", data);
          resolve(data);
        })
        .catch((error) => {
          console.error("Error:", error);
          resolve([]);
        });
    } catch (error) {
      console.error("Unexpected error:", error);
      resolve([]);
    }
  });
};
