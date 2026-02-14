# Project Rules

## App Structure Standard
- All new apps must follow the same folder structure as:
  `/home/user/adslab/categories/bet/animal-race`
- Required files inside each app folder:
  - `index.html`
  - `main.js`
  - `style.css`
  - `preview.png`

## Reminder
- When creating a new app, use the exact file naming above.
- Keep app assets and code self-contained within the app folder.
- Always push changes for any updates to this web project.

## Typography
- Always use the Pretendard font for all pages and UI.

## Default External Tags For New Apps
- Every new app must include all required external integrations in `index.html` by default.
- Google Analytics is mandatory on every new app page. Insert the following snippet right before `</head>`:
  ```html
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VVPH6H74GP"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-VVPH6H74GP');
  </script>
  ```
- Disqus comments are mandatory on every new app page. Insert the following block right before `</body>`:
  ```html
  <div id="disqus_thread"></div>
  <script>
      (function() {
      var d = document, s = d.createElement('script');
      s.src = 'https://simsim-3.disqus.com/embed.js';
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
      })();
  </script>
  <noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
  ```
- Formspree integration is mandatory for any new app that includes a contact, feedback, or request form.
- For Formspree forms, always use `method="POST"` and set `action` to the project Formspree endpoint (`https://formspree.io/f/{FORM_ID}` format).

## How To Request Work (Efficiency Rules)
- Always specify the exact target path (e.g. `/home/user/adslab/categories/etc/compound-interest`) and whether the task is a new app or an update to an existing app.
- If updating, name the exact files to touch (`index.html`, `main.js`, `style.css` or `styles.css`, `preview.png`) and any files to avoid.
- Provide the desired behavior and any formulas or data rules in precise terms; include example input/output if possible.
- If matching another page, supply a screenshot or a list of UI/feature requirements.
- State any constraints up front (fonts, colors, layout, performance, mobile behavior).
- Say whether to commit and push; default is to commit + push after changes.
