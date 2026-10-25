"""Catalog contract and untrusted-input regression tests; no HA install needed."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("catalog", ROOT / "custom_components/homepage_native/catalog.py")
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)
BASE = "https://homepage.example.com"


class CatalogTests(unittest.TestCase):
    def test_whitelist_drops_widget_credentials_and_unknown_fields(self):
        result = catalog.parse_catalog([{"name":"Media", "services":[{
            "name":"Movies", "href":"https://movies.example.com", "description":"Watch", "icon":"plex.png",
            "widgets":[{"key":"DO_NOT_EXPOSE", "password":"SECRET"}], "token":"SECRET", "ping":"http://private/health"
        }]}], BASE)
        service = result[0]["services"][0]
        self.assertEqual(set(service), {"name","description","url","image"})
        self.assertNotIn("SECRET", str(result))

    def test_nested_groups_preserve_order_and_path(self):
        result = catalog.parse_catalog([{"name":"Tools", "groups":[{"name":"Files", "services":[{"name":"Docs","href":"/docs"}]}]}], BASE)
        self.assertEqual(result[0]["name"], "Tools / Files")
        self.assertEqual(result[0]["services"][0]["url"], BASE + "/docs")

    def test_missing_or_executable_links_fall_back_to_homepage(self):
        for href in [None, "javascript:alert(1)", "data:text/html,hi", "https://user:password@example.com", "https://example.com:BAD", "https:\\evil.test"]:
            with self.subTest(href=href):
                self.assertIsNone(catalog.safe_link(href, BASE))
                result = catalog.parse_catalog([{"name":"Tools","services":[{"name":"App","href":href}]}], BASE)
                self.assertEqual(result[0]["services"][0]["url"], BASE)

    def test_icons(self):
        self.assertEqual(catalog.resolve_icon("mdi-server-network-#ffffff", BASE), {"icon":"mdi:server-network"})
        self.assertEqual(catalog.resolve_icon("mdi:server", BASE), {"icon":"mdi:server"})
        self.assertTrue(catalog.resolve_icon("sh-paperless-ngx.svg", BASE)["image"].endswith("/svg/paperless-ngx.svg"))
        self.assertTrue(catalog.resolve_icon("si-github-#ffffff", BASE)["image"].endswith("/github.svg"))
        self.assertEqual(catalog.resolve_icon("/icons/custom.png", BASE)["image"], BASE + "/icons/custom.png")
        self.assertEqual(catalog.resolve_icon("<script>alert(1)</script>", BASE), {"icon":"mdi:application-outline"})

    def test_bad_api_shapes_fail_instead_of_erasing_catalog(self):
        for payload in [{"error":"invalid host"}, "login", [None], [{"name":"x","services":{}}], [{"name":"x","services":[{}]}]]:
            with self.subTest(payload=payload), self.assertRaises(catalog.InvalidCatalog):
                catalog.parse_catalog(payload, BASE)

    def test_empty_catalog_is_valid(self):
        self.assertEqual(catalog.parse_catalog([], BASE), [])

    def test_url_validation_and_subpath(self):
        self.assertEqual(catalog.normalize_url(" https://EXAMPLE.com/home/ "), "https://example.com/home")
        for value in ["example.com", "ftp://example.com", "https://u:p@example.com", "https://example.com?key=SECRET", "https://example.com#hash"]:
            with self.subTest(value=value), self.assertRaises(ValueError): catalog.normalize_url(value)

    def test_excessive_catalog_is_rejected(self):
        with self.assertRaises(catalog.InvalidCatalog):
            catalog.parse_catalog([{"name":"x","services":[{"name":"x"}] * 2001}], BASE)


if __name__ == "__main__": unittest.main()
