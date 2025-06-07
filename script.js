// --- Popup Display
function displayPopup() {
	const base_div = document.createElement("div");
	base_div.id = "base_div_popup";
	Object.assign(base_div.style, {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		width: "100vw",
		height: "100vh",
		zIndex: "1000",
		backgroundColor: "rgba(0, 0, 0, 0.6)",
		position: "fixed",
		top: "0",
		left: "0"
	});

	document.body.appendChild(base_div);

	const popup = document.createElement("div");
	Object.assign(popup.style, {
		backgroundColor: "#000000",
		width: "320px",
		minHeight: "200px",
		border: "1px solid #333333",
		borderRadius: "12px",
		padding: "20px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "10px",
		boxShadow: "0 0 15px rgba(0, 0, 0, 0.3)"
	});

	base_div.appendChild(popup);

	const heading = document.createElement("h1");
		heading.textContent = "Instagram Followers Tool";

		const paragraph = document.createElement("p");
		paragraph.innerHTML = "Made by <a href='https://github.com/matthewdotpy'>@matthewdotpy</a>";

		popup.appendChild(heading);
		popup.appendChild(paragraph);


	const menuItems = [
		{ label: "📥 You Don't Follow Back", id: "followers_btn" },
		{ label: "🤝 Mutual", id: "mutual_btn" },
		{ label: "🚫 Not Following You Back", id: "not_following_btn" }
	];

	menuItems.forEach(({ label, id }) => {
		const btn = document.createElement("button");
		btn.id = id;
		btn.textContent = label;
		Object.assign(btn.style, {
		width: "100%",
		padding: "10px",
		fontSize: "14px",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		backgroundColor: "#333333",
		color: "#fff"
		});
		popup.appendChild(btn);
	});
}

// --- Core Logic
const username = window.location.pathname.replace("/", "").replace("/", "");

async function getUserIdFromUsername(username) {
	const res = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
		headers: {
			"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X)",
			"X-IG-App-ID": "936619743392459"
		},
		credentials: "include"
	});

	if (!res.ok) {
		alert("❌ Failed to fetch user ID.");
		return null;
	}

	const data = await res.json();
	return data.data?.user?.id || null;
}

let userId = null;

let fetchCounter = 0;
const totalFetches = 2;
const allUsers = {};

const config = {
	followers: {
		hash: "c76146de99bb02f6415203be841dd25a",
		path: "edge_followed_by"
	},
	following: {
		hash: "d04b0a864b4b54837c0d870b0e77e076",
		path: "edge_follow"
	}
};

async function makeNextRequest(cursor, listConfig, addValue) {
	const params = {
		id: userId,
		include_reel: true,
		fetch_mutual: true,
		first: 50,
		after: cursor
	};

	const url = `https://www.instagram.com/graphql/query/?query_hash=${listConfig.hash}&variables=${encodeURIComponent(JSON.stringify(params))}`;

	try {
		const res = await fetch(url);
		const json = await res.json();
		const edges = json.data.user[listConfig.path].edges;

		edges.forEach(({ node }) => {
		const { username, profile_pic_url } = node;
		if (allUsers[username]) {
			allUsers[username].value += addValue;
		} else {
			allUsers[username] = { value: addValue, profile_pic: profile_pic_url };
		}
		});

		const pageInfo = json.data.user[listConfig.path].page_info;
		if (pageInfo.has_next_page) {
		await makeNextRequest(pageInfo.end_cursor, listConfig, addValue);
		} else {
		fetchCounter++;
		if (fetchCounter === totalFetches) displayResults();
		}
	} catch (err) {
		console.error("Error fetching data:", err);
	}
}

// --- Result UI
function displayResults() {
	const mutual = [];
	const notFollowingBack = [];
	const followYouOnly = [];

	for (const [username, data] of Object.entries(allUsers)) {
		if (data.value === 0) mutual.push(dataEntry(username, data.profile_pic));
		else if (data.value === -1) notFollowingBack.push(dataEntry(username, data.profile_pic));
		else if (data.value === 1) followYouOnly.push(dataEntry(username, data.profile_pic));
	}

	const sections = {
		followers_btn: followYouOnly,
		mutual_btn: mutual,
		not_following_btn: notFollowingBack
	};

	Object.entries(sections).forEach(([btnId, list]) => {
		const btn = document.getElementById(btnId);
		if (!btn) return;

		btn.onclick = () => {
		Object.keys(sections).forEach(id => {
			const b = document.getElementById(id);
			if (b) b.style.backgroundColor = "#333";  // default color
		});

		// Highlight current button
		btn.style.backgroundColor = "#363C44";

		const oldList = document.getElementById("result_list");
		if (oldList) oldList.remove();

		const container = document.createElement("div");
		container.id = "result_list";
		Object.assign(container.style, {
			marginTop: "15px",
			maxHeight: "250px",
			overflowY: "auto",
			width: "100%",
			background: "#000000",
			padding: "10px",
			borderRadius: "8px",
			scrollbarWidth: "thin",
		});
		container.style.setProperty("scrollbar-color", "#000000");


		list.forEach(entry => container.appendChild(entry));
		btn.parentElement.appendChild(container);
		};
	});
}

function dataEntry(username, profile_pic) {
	const link = document.createElement("a");
	link.href = `https://instagram.com/${username}`;
	link.target = "_blank";
	Object.assign(link.style, {
		display: "flex",
		alignItems: "center",
		textDecoration: "none",
		color: "white",
		marginBottom: "8px"
	});

	const img = document.createElement("img");
	img.src = profile_pic;
	img.style.width = "32px";
	img.style.height = "32px";
	img.style.borderRadius = "50%";
	img.style.marginRight = "10px";

	const span = document.createElement("span");
	span.textContent = username;
	span.style.fontSize = "14px";

	link.appendChild(img);
	link.appendChild(span);
	return link;
}

getUserIdFromUsername(username).then(id => {
	if (id) {
		userId = id;
		console.log("✅ Auto-fetched user ID:", userId);
		displayPopup();
		makeNextRequest("", config.following, -1);
		makeNextRequest("", config.followers, 1);
	} else {
		alert("❌ Couldn't get user ID from username.");
	}
});
