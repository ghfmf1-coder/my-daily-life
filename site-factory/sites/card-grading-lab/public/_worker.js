// Only the retired Pages hostname redirects. The new hostname serves its assets normally.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "tb-card-grading-lab.pages.dev") {
      url.protocol = "https:";
      url.hostname = "card-grading-lab.abreda.com";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  }
};
