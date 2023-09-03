import { $el, ComfyDialog } from "../../../../scripts/ui.js";
import { api } from "../../../../scripts/api.js";
import { addStylesheet } from "./utils.js";

addStylesheet(import.meta.url);

class MetadataDialog extends ComfyDialog {
	constructor() {
		super();

		this.element.classList.add("pysssss-model-metadata");
	}
	show(metadata) {
		super.show(
			$el(
				"div",
				Object.keys(metadata).map((k) =>
					$el("div", [$el("label", { textContent: k }), $el("span", { textContent: metadata[k] })])
				)
			)
		);
	}
}

export class ModelInfoDialog extends ComfyDialog {
	constructor(name) {
		super();
		this.name = name;
		this.element.classList.add("pysssss-model-info");
	}

	get customNotes() {
		return this.metadata["pysssss.notes"];
	}

	get hash() {
		return this.metadata["pysssss.sha256"];
	}

	async show(type, value) {
		const req = api.fetchApi("/pysssss/metadata/" + encodeURIComponent(`${type}/${value}`));
		this.info = $el("div");
		this.img = $el("img", { style: { display: "none" } });
		this.main = $el("main", { style: { display: "flex" } }, [this.info, this.img]);
		this.content = $el("div.pysssss-model-content", [$el("h2", { textContent: this.name }), this.main]);

		const loading = $el("div", { textContent: "ℹ️ Loading...", parent: this.content });

		super.show(this.content);

		this.metadata = await (await req).json();
		this.viewMetadata.style.cursor = this.viewMetadata.style.opacity = "";
		this.viewMetadata.removeAttribute("disabled");

		loading.remove();
		this.addInfo();
	}

	createButtons() {
		const btns = super.createButtons();
		this.viewMetadata = $el("button", {
			type: "button",
			textContent: "View raw metadata",
			disabled: "disabled",
			style: {
				opacity: 0.5,
				cursor: "not-allowed",
			},
			onclick: (e) => {
				if (this.metadata) {
					new MetadataDialog().show(this.metadata);
				}
			},
		});

		btns.unshift(this.viewMetadata);
		return btns;
	}

	getNoteInfo() {
		if (this.customNotes) {
			let notes = [];
			// Extract links from notes
			const r = new RegExp("(\\bhttps?:\\/\\/[^\\s]+)", "g");
			let end = 0;
			let m;
			do {
				m = r.exec(this.customNotes);
				let pos;
				let fin = 0;
				if (m) {
					pos = m.index;
					fin = m.index + m[0].length;
				} else {
					pos = this.customNotes.length;
				}

				let pre = this.customNotes.substring(end, pos);
				if (pre) {
					pre = pre.replaceAll("\n", "<br>");
					notes.push(
						$el("span", {
							innerHTML: pre,
						})
					);
				}
				if (m) {
					notes.push(
						$el("a", {
							href: m[0],
							textContent: m[0],
							target: "_blank",
						})
					);
				}

				end = fin;
			} while (m);
			return $el("span", notes);
		} else {
			let last = this.name.lastIndexOf(".");
			if (last === -1) {
				last = this.name.length;
			}
			return `Add custom notes in ${this.name.substring(0, last) + ".txt"}`;
		}
	}

	addInfo() {
		this.addInfoEntry("Notes", this.getNoteInfo());
	}

	addInfoEntry(name, value) {
		return $el(
			"p",
			{
				parent: this.info,
			},
			[
				typeof name === "string" ? $el("label", { textContent: name + ": " }) : name,
				typeof value === "string" ? $el("span", { textContent: value }) : value,
			]
		);
	}

	async getCivitaiDetails() {
		const req = await fetch("https://civitai.com/api/v1/model-versions/by-hash/" + this.hash);
		if (req.status === 200) {
			return await req.json();
		} else if (req.status === 404) {
			throw new Error("Model not found");
		} else {
			throw new Error(`Error loading info (${req.status}) ${req.statusText}`);
		}
	}

	addCivitaiInfo() {
		const promise = this.getCivitaiDetails();
		const content = $el("span", { textContent: "ℹ️ Loading..." });

		this.addInfoEntry(
			$el("label", [
				$el("img", {
					style: {
						width: "18px",
						position: "relative",
						top: "3px",
						margin: "0 5px 0 0",
					},
					src: "https://civitai.com/favicon.ico",
				}),
				$el("span", { textContent: "Civitai: " }),
			]),
			content
		);

		return promise
			.then((info) => {
				content.replaceChildren(
					$el("a", {
						href: "https://civitai.com/models/" + info.modelId,
						textContent: "View " + info.model.name,
						target: "_blank",
					})
				);

				if (info.images?.length) {
					this.img.src = info.images[0].url;
					this.img.style.display = "";
				}

				return info;
			})
			.catch((err) => {
				content.textContent = "⚠️ " + err.message;
			});
	}
}