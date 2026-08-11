require("dotenv").config();

const express = require("express");
const session = require("express-session");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN;

const SITE_FILE = "data/site.json";
const PAGES_DIR = "data/pages";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

app.set("trust proxy", 1);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static("public"));

/* -------------------------
   GITHUB
------------------------- */

async function githubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      `GitHub returned ${response.status}`
    );
  }

  return data;
}

function githubUrl(path) {
  return (
    `https://api.github.com/repos/${OWNER}/${REPO}` +
    `/contents/${path}`
  );
}

async function getGithubFile(path) {
  return githubRequest(
    `${githubUrl(path)}?ref=${encodeURIComponent(BRANCH)}`
  );
}

async function getJson(path) {
  const file = await getGithubFile(path);

  const decoded = Buffer.from(
    file.content.replace(/\n/g, ""),
    "base64"
  ).toString("utf8");

  return {
    data: JSON.parse(decoded),
    sha: file.sha
  };
}

async function saveJson(path, data, sha, message) {
  const content = Buffer.from(
    JSON.stringify(data, null, 2) + "\n"
  ).toString("base64");

  const body = {
    message,
    content,
    branch: BRANCH
  };

  if (sha) {
    body.sha = sha;
  }

  return githubRequest(
    githubUrl(path),
    {
      method: "PUT",
      body: JSON.stringify(body)
    }
  );
}

async function deleteGithubFile(path, sha, message) {
  return githubRequest(
    githubUrl(path),
    {
      method: "DELETE",
      body: JSON.stringify({
        message,
        sha,
        branch: BRANCH
      })
    }
  );
}

/* -------------------------
   DEFAULT DATA
------------------------- */

const defaultSite = {
  siteName: "DFFDF",
  defaultTheme: "midnight",

  themes: {
    midnight: {
      background: "#07070b",
      surface: "#11121a",
      text: "#ffffff",
      muted: "#9b9ba8",
      accent: "#8065ff",
      accent2: "#b19cff"
    },

    aurora: {
      background: "#06100e",
      surface: "#0d1c19",
      text: "#ffffff",
      muted: "#9bb8af",
      accent: "#48e6b2",
      accent2: "#9bffe0"
    },

    ocean: {
      background: "#06101a",
      surface: "#0d1925",
      text: "#ffffff",
      muted: "#9bb2c7",
      accent: "#38a9ff",
      accent2: "#8bd1ff"
    },

    sunset: {
      background: "#13090d",
      surface: "#211117",
      text: "#ffffff",
      muted: "#c4a1aa",
      accent: "#ff6b7a",
      accent2: "#ffb36b"
    },

    light: {
      background: "#f4f5f8",
      surface: "#ffffff",
      text: "#101015",
      muted: "#686975",
      accent: "#6246e8",
      accent2: "#927cff"
    }
  },

  navigation: [
    {
      label: "Home",
      href: "/"
    },
    {
      label: "Example",
      href: "/example"
    }
  ],

  media: []
};

const defaultHome = {
  slug: "home",
  title: "Home",
  theme: "inherit",

  sections: [
    {
      type: "hero",
      badge: "WELCOME TO DFFDF",
      title: "Create something people remember.",
      text: "A modern Liquid Glass experience built to look beautiful, feel fast and work everywhere.",
      buttonText: "Explore",
      buttonUrl: "#features",
      image: ""
    },

    {
      type: "text",
      title: "Built with purpose.",
      text: "DFFDF is a modern website platform with a powerful admin panel, flexible themes and AI-assisted editing.",
      image: ""
    },

    {
      type: "cards",
      title: "What we do",
      text: "Everything you need to create something remarkable.",
      cards: [
        {
          title: "Creative",
          text: "Beautiful interfaces designed around your brand."
        },
        {
          title: "Fast",
          text: "Responsive experiences for every device."
        },
        {
          title: "Simple",
          text: "Manage your website without editing code."
        }
      ]
    },

    {
      type: "contact",
      title: "Let's build something.",
      text: "Have an idea, question or project? We'd love to hear from you.",
      email: "hello@example.com"
    }
  ]
};

const defaultExample = {
  slug: "example",
  title: "Example",
  theme: "ocean",

  sections: [
    {
      type: "hero",
      badge: "DEMO PAGE",
      title: "This is the example page.",
      text: "Use this page to experiment with themes, sections, images and the AI builder.",
      buttonText: "Back Home",
      buttonUrl: "/",
      image: ""
    },

    {
      type: "cards",
      title: "Try the builder",
      text: "Create another page from the admin panel.",
      cards: [
        {
          title: "New pages",
          text: "Create unlimited custom pages."
        },
        {
          title: "Themes",
          text: "Use Midnight, Aurora, Ocean, Sunset or Custom."
        },
        {
          title: "AI",
          text: "Ask the AI builder to change your page."
        }
      ]
    }
  ]
};

/* -------------------------
   DATA MIGRATION
------------------------- */

async function ensureSite() {
  try {
    return await getJson(SITE_FILE);
  } catch {
    try {
      const old = await getJson(
        "data/site-content.json"
      );

      const converted = {
        ...defaultSite,
        siteName:
          old.data.siteName ||
          defaultSite.siteName
      };

      await saveJson(
        SITE_FILE,
        converted,
        null,
        "Create new site configuration"
      );

      return {
        data: converted,
        sha: null
      };
    } catch {
      await saveJson(
        SITE_FILE,
        defaultSite,
        null,
        "Create DFFDF site configuration"
      );

      return {
        data: defaultSite,
        sha: null
      };
    }
  }
}

async function ensurePage(page) {
  const path =
    `${PAGES_DIR}/${page.slug}.json`;

  try {
    return await getJson(path);
  } catch {
    await saveJson(
      path,
      page,
      null,
      `Create ${page.slug} page`
    );

    return {
      data: page,
      sha: null
    };
  }
}

/* -------------------------
   AUTH
------------------------- */

function requireAdmin(req, res, next) {
  if (req.session.isAdmin === true) {
    return next();
  }

  res.status(401).json({
    error: "Unauthorized"
  });
}

app.get("/api/admin/session", (req, res) => {
  res.json({
    authenticated:
      req.session.isAdmin === true
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      error: "Invalid username or password"
    });
  }

  req.session.isAdmin = true;

  res.json({
    success: true
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true
    });
  });
});

/* -------------------------
   PUBLIC API
------------------------- */

app.get("/api/site", async (req, res) => {
  try {
    const site = await ensureSite();

    const slug =
      (req.query.page || "home")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "") || "home";

    let page;

    if (slug === "home") {
      page = await ensurePage(
        defaultHome
      );
    } else if (slug === "example") {
      page = await ensurePage(
        defaultExample
      );
    } else {
      page = await getJson(
        `${PAGES_DIR}/${slug}.json`
      );
    }

    res.json({
      site: site.data,
      page: page.data
    });

  } catch (error) {
    console.error("Public API:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

/* -------------------------
   ADMIN SITE
------------------------- */

app.get(
  "/api/admin/site",
  requireAdmin,
  async (req, res) => {
    try {
      const site =
        await ensureSite();

      res.json(site.data);

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

app.post(
  "/api/admin/site",
  requireAdmin,
  async (req, res) => {
    try {
      const current =
        await ensureSite();

      await saveJson(
        SITE_FILE,
        req.body,
        current.sha,
        "Update DFFDF site settings"
      );

      res.json({
        success: true
      });

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

/* -------------------------
   PAGES
------------------------- */

app.get(
  "/api/admin/pages",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await githubRequest(
          `${githubUrl(PAGES_DIR)}?ref=${encodeURIComponent(BRANCH)}`
        );

      const pages = [];

      for (const item of result) {
        if (
          item.type === "file" &&
          item.name.endsWith(".json")
        ) {
          pages.push({
            slug: item.name
              .replace(".json", ""),
            path: item.path
          });
        }
      }

      if (
        !pages.some(p => p.slug === "home")
      ) {
        pages.push({
          slug: "home",
          path: `${PAGES_DIR}/home.json`
        });
      }

      if (
        !pages.some(p => p.slug === "example")
      ) {
        pages.push({
          slug: "example",
          path: `${PAGES_DIR}/example.json`
        });
      }

      res.json(pages);

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

app.get(
  "/api/admin/pages/:slug",
  requireAdmin,
  async (req, res) => {
    try {
      const slug =
        req.params.slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-");

      let result;

      try {
        result =
          await getJson(
            `${PAGES_DIR}/${slug}.json`
          );
      } catch {
        if (slug === "home") {
          result =
            await ensurePage(
              defaultHome
            );
        } else if (slug === "example") {
          result =
            await ensurePage(
              defaultExample
            );
        } else {
          throw new Error(
            "Page not found"
          );
        }
      }

      res.json(result.data);

    } catch (error) {
      res.status(404).json({
        error: error.message
      });
    }
  }
);

app.post(
  "/api/admin/pages",
  requireAdmin,
  async (req, res) => {
    try {
      const slug =
        String(req.body.slug || "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, "-");

      if (!slug) {
        return res.status(400).json({
          error: "Invalid page slug"
        });
      }

      const page = {
        slug,
        title:
          req.body.title ||
          slug,
        theme: "inherit",
        sections: [
          {
            type: "hero",
            badge: "NEW PAGE",
            title:
              req.body.title ||
              slug,
            text:
              "Edit this page from the admin panel.",
            buttonText: "Explore",
            buttonUrl: "#",
            image: ""
          }
        ]
      };

      await saveJson(
        `${PAGES_DIR}/${slug}.json`,
        page,
        null,
        `Create ${slug} page`
      );

      res.json({
        success: true,
        page
      });

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

app.post(
  "/api/admin/pages/:slug",
  requireAdmin,
  async (req, res) => {
    try {
      const slug =
        req.params.slug;

      const path =
        `${PAGES_DIR}/${slug}.json`;

      const current =
        await getJson(path);

      const page = {
        ...req.body,
        slug
      };

      await saveJson(
        path,
        page,
        current.sha,
        `Update ${slug} page`
      );

      res.json({
        success: true
      });

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

app.delete(
  "/api/admin/pages/:slug",
  requireAdmin,
  async (req, res) => {
    try {
      const slug =
        req.params.slug;

      if (
        slug === "home" ||
        slug === "example"
      ) {
        return res.status(400).json({
          error:
            "The Home and Example pages cannot be deleted."
        });
      }

      const path =
        `${PAGES_DIR}/${slug}.json`;

      const current =
        await getJson(path);

      await deleteGithubFile(
        path,
        current.sha,
        `Delete ${slug} page`
      );

      res.json({
        success: true
      });

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

/* -------------------------
   MEDIA
------------------------- */

app.post(
  "/api/admin/media/upload",
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No image uploaded"
        });
      }

      const safeName =
        req.file.originalname
          .toLowerCase()
          .replace(/[^a-z0-9.-]/g, "-");

      const filename =
        `${Date.now()}-${safeName}`;

      const path =
        `public/uploads/${filename}`;

      const content =
        req.file.buffer.toString("base64");

      await githubRequest(
        githubUrl(path),
        {
          method: "PUT",
          body: JSON.stringify({
            message:
              `Upload image ${filename}`,
            content,
            branch: BRANCH
          })
        }
      );

      res.json({
        success: true,
        url: `/uploads/${filename}`,
        githubPath: path
      });

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

app.post(
  "/api/admin/media/url",
  requireAdmin,
  async (req, res) => {
    try {
      const url =
        String(req.body.url || "").trim();

      if (
        !/^https?:\/\//i.test(url)
      ) {
        return res.status(400).json({
          error: "Enter a valid image URL"
        });
      }

      res.json({
        success: true,
        url
      });

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);
/* -------------------------
   AI BUILDER - MULTI PROVIDER
------------------------- */

function getAIConfig(preference = "auto") {
  const providers = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      id: "openai",
      name: "OpenAI",
      model:
        process.env.OPENAI_MODEL ||
        "gpt-5-mini",
      cost: "medium",
      speed: "fast"
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      id: "gemini",
      name: "Google Gemini",
      model:
        process.env.GEMINI_MODEL ||
        "gemini-2.5-flash",
      cost: "low",
      speed: "fast"
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      id: "anthropic",
      name: "Anthropic Claude",
      model:
        process.env.ANTHROPIC_MODEL ||
        "claude-3-5-haiku-latest",
      cost: "low",
      speed: "fast"
    });
  }

  if (!providers.length) {
    return null;
  }

  if (
    preference !== "auto" &&
    preference !== "low-cost" &&
    preference !== "fast" &&
    preference !== "best"
  ) {
    const selected =
      providers.find(
        p => p.id === preference
      );

    if (selected) return selected;
  }

  if (preference === "low-cost") {
    return (
      providers.find(
        p => p.cost === "low"
      ) ||
      providers[0]
    );
  }

  if (preference === "fast") {
    return (
      providers.find(
        p => p.speed === "fast"
      ) ||
      providers[0]
    );
  }

  if (preference === "best") {
    return (
      providers.find(
        p => p.id === "openai"
      ) ||
      providers[0]
    );
  }

  return providers[0];
}


async function callOpenAI(
  provider,
  system,
  prompt
) {
  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${process.env.OPENAI_API_KEY}`
      },

      body: JSON.stringify({
        model: provider.model,
        instructions: system,
        input: prompt,
        text: {
          format: {
            type: "json_object"
          }
        },
        store: false
      })
    }
  );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI: ${text}`
    );
  }

  const data =
    JSON.parse(text);

  const output =
    data.output_text ||
    data.output
      ?.flatMap(x => x.content || [])
      ?.map(x => x.text || "")
      ?.join("") ||
    "";

  return output;
}


async function callGemini(
  provider,
  system,
  prompt
) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

  const response = await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: system
            }
          ]
        },

        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],

        generationConfig: {
          responseMimeType:
            "application/json"
        }
      })
    }
  );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Gemini: ${text}`
    );
  }

  const data =
    JSON.parse(text);

  return (
    data.candidates?.[0]
      ?.content?.parts?.[0]
      ?.text || ""
  );
}


async function callAnthropic(
  provider,
  system,
  prompt
) {
  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-api-key":
          process.env.ANTHROPIC_API_KEY,

        "anthropic-version":
          "2023-06-01"
      },

      body: JSON.stringify({
        model: provider.model,

        max_tokens: 8000,

        system,

        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    }
  );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Anthropic: ${text}`
    );
  }

  const data =
    JSON.parse(text);

  return (
    data.content
      ?.map(x => x.text || "")
      .join("") || ""
  );
}


async function runAI(
  provider,
  system,
  prompt
) {
  if (provider.id === "openai") {
    return callOpenAI(
      provider,
      system,
      prompt
    );
  }

  if (provider.id === "gemini") {
    return callGemini(
      provider,
      system,
      prompt
    );
  }

  if (provider.id === "anthropic") {
    return callAnthropic(
      provider,
      system,
      prompt
    );
  }

  throw new Error(
    "Unsupported AI provider"
  );
}


app.get(
  "/api/admin/ai/providers",
  requireAdmin,
  async (req, res) => {
    const providers = [];

    if (process.env.OPENAI_API_KEY) {
      providers.push({
        id: "openai",
        name: "OpenAI",
        configured: true
      });
    }

    if (process.env.GEMINI_API_KEY) {
      providers.push({
        id: "gemini",
        name: "Google Gemini",
        configured: true
      });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      providers.push({
        id: "anthropic",
        name: "Anthropic Claude",
        configured: true
      });
    }

    res.json({
      providers,
      auto: providers.length > 0
    });
  }
);


app.post(
  "/api/admin/ai",
  requireAdmin,
  async (req, res) => {
    try {
      const message =
        String(
          req.body.message || ""
        ).trim();

      if (!message) {
        return res.status(400).json({
          error:
            "Enter an AI request."
        });
      }

      const preference =
        String(
          req.body.preference ||
          "auto"
        );

      const provider =
        getAIConfig(
          preference
        );

      if (!provider) {
        return res.status(503).json({
          error:
            "No AI provider is configured. Add an AI API key in Render Environment Variables."
        });
      }

      const page =
        req.body.page ||
        defaultHome;

      const site =
        req.body.site ||
        defaultSite;

      const system = `
You are the DFFDF Liquid Glass
website builder.

You modify website content,
not server code.

Design language:
- Liquid Glass
- translucent surfaces
- soft borders
- gradients
- elegant typography
- modern responsive layouts
- premium futuristic appearance

Return ONLY valid JSON.

Return exactly:

{
  "reply": "short explanation",
  "page": {}
}

Never return JavaScript.
Never return HTML.
Never return Markdown.

Preserve the page slug.

Allowed section types:
hero
text
image
cards
contact

Cards must use:

{
  "type": "cards",
  "title": "...",
  "text": "...",
  "cards": [
    {
      "title": "...",
      "text": "..."
    }
  ]
}

Keep existing content unless
the user asks you to change it.
`;

      const prompt = `
CURRENT SITE:

${JSON.stringify(site)}

CURRENT PAGE:

${JSON.stringify(page)}

USER REQUEST:

${message}

Update the page to satisfy
the user's request.

Return valid JSON only.
`;

      const raw =
        await runAI(
          provider,
          system,
          prompt
        );

      let result;

      try {
        result =
          JSON.parse(raw);
      } catch {
        throw new Error(
          "AI returned invalid JSON."
        );
      }

      if (
        !result.page ||
        typeof result.page !==
          "object"
      ) {
        throw new Error(
          "AI did not return a valid page."
        );
      }

      result.page.slug =
        page.slug;

      res.json({
        success: true,

        provider: {
          id: provider.id,
          name: provider.name,
          model: provider.model
        },

        reply:
          result.reply ||
          "Page updated.",

        page:
          result.page
      });

    } catch (error) {
      console.error(
        "AI Builder:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "AI request failed."
      });
    }
  }
);

/* -------------------------
   ADMIN PAGE
------------------------- */

app.get("/admin", (req, res) => {
  res.sendFile(
    "admin.html",
    {
      root: "views"
    }
  );
});

/* -------------------------
   PUBLIC PAGES
------------------------- */

app.get(/.*/, (req, res, next) => {
  if (
    req.path.startsWith("/api/") ||
    req.path === "/admin"
  ) {
    return next();
  }

  res.sendFile(
    "index.html",
    {
      root: "public"
    }
  );
});

/* -------------------------
   START
------------------------- */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `DFFDF CMS running on port ${PORT}`
    );
  }
);
