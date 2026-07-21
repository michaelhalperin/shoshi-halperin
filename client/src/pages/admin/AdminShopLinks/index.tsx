import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError, type ShopLink } from "../../../api";
import {
  Badge,
  Button,
  ConfirmModal,
  ErrorNote,
  Input,
  Modal,
  Spinner,
} from "../../../components/ui";
import { useI18n } from "../../../i18n";

const emptyForm = {
  titleEn: "",
  titleHe: "",
  categoryEn: "Kitchen Accessories",
  categoryHe: "אביזרי מטבח",
  shopName: "Batshi Home",
  productUrl: "",
  imageUrl: "",
  price: "" as string | number,
  utmSource: "shoshi_halperin",
  utmMedium: "referral",
  utmCampaign: "kitchen_accessories",
  active: true,
  sortOrder: "0",
};

type ShopLinkForm = typeof emptyForm;

function buildPreviewUrl(form: ShopLinkForm) {
  try {
    const url = new URL(form.productUrl);
    url.searchParams.set("utm_source", form.utmSource);
    url.searchParams.set("utm_medium", form.utmMedium);
    if (form.utmCampaign) url.searchParams.set("utm_campaign", form.utmCampaign);
    return url.toString();
  } catch {
    return "";
  }
}

export default function AdminShopLinks() {
  const { t, pick } = useI18n();
  const [links, setLinks] = useState<ShopLink[] | null>(null);
  const [editing, setEditing] = useState<ShopLink | "new" | null>(null);
  const [form, setForm] = useState<ShopLinkForm>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<ShopLink | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => {
    api.get<{ links: ShopLink[] }>("/api/shop-links?all=1").then((d) => setLinks(d.links));
  };

  useEffect(load, []);

  const grouped = useMemo(() => {
    if (!links) return [];
    const map = new Map<string, ShopLink[]>();
    for (const link of links) {
      const key = `${link.categoryEn}|||${link.categoryHe}`;
      const bucket = map.get(key) ?? [];
      bucket.push(link);
      map.set(key, bucket);
    }
    return [...map.entries()].map(([key, items]) => {
      const [categoryEn, categoryHe] = key.split("|||");
      return { categoryEn, categoryHe, items };
    });
  }, [links]);

  const openNew = () => {
    setForm(emptyForm);
    setError("");
    setEditing("new");
  };

  const openEdit = (link: ShopLink) => {
    setForm({
      titleEn: link.titleEn,
      titleHe: link.titleHe,
      categoryEn: link.categoryEn,
      categoryHe: link.categoryHe,
      shopName: link.shopName,
      productUrl: link.productUrl,
      imageUrl: link.imageUrl ?? "",
      price: link.price ?? "",
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign ?? "",
      active: link.active,
      sortOrder: String(link.sortOrder),
    });
    setError("");
    setEditing(link);
  };

  const copyLink = async (link: ShopLink) => {
    const url =
      link.attributedUrl ??
      buildPreviewUrl({
        ...emptyForm,
        productUrl: link.productUrl,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign ?? "",
      });
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    const payload = {
      titleEn: form.titleEn,
      titleHe: form.titleHe,
      categoryEn: form.categoryEn,
      categoryHe: form.categoryHe,
      shopName: form.shopName,
      productUrl: form.productUrl,
      imageUrl: form.imageUrl || null,
      price: form.price === "" ? null : Number(form.price),
      utmSource: form.utmSource,
      utmMedium: form.utmMedium,
      utmCampaign: form.utmCampaign || null,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      if (editing === "new") {
        await api.post("/api/shop-links", payload);
      } else if (editing) {
        await api.put(`/api/shop-links/${editing.id}`, payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.delete(`/api/shop-links/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const previewUrl = buildPreviewUrl(form);

  if (!links) return <Spinner />;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
            {t("manageShopLinks")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-light text-stone-500">{t("shopLinksHelp")}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openNew}>
          + {t("newShopLink")}
        </Button>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm font-light text-stone-500">{t("noShopLinks")}</p>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={`${group.categoryEn}-${group.categoryHe}`}>
              <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
                {group.items.map((link) => (
                  <div
                    key={link.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5"
                  >
                    <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                      {link.imageUrl && (
                        <img
                          src={link.imageUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-14 w-14 shrink-0 border border-stone-200 object-cover sm:h-16 sm:w-16"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="font-display text-base font-semibold leading-snug text-ink sm:text-lg">
                            {pick(link, "title")}
                          </span>
                          <Badge tone={link.active ? "green" : "stone"}>
                            {link.active ? t("active") : t("inactive")}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm font-light text-stone-500">
                          {link.price != null && <>₪{link.price} · </>}
                          {t("shopLinkSort")}: {link.sortOrder}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0 sm:flex-wrap">
                      <Button
                        variant="secondary"
                        className="min-w-0 px-2 text-[11px] tracking-[0.08em] sm:px-5 sm:text-[13px] sm:tracking-[0.12em]"
                        onClick={() => void copyLink(link)}
                      >
                        {copiedId === link.id ? t("shopLinkCopied") : t("copyShopLink")}
                      </Button>
                      <Button
                        variant="secondary"
                        className="min-w-0 px-2 text-[11px] tracking-[0.08em] sm:px-5 sm:text-[13px] sm:tracking-[0.12em]"
                        onClick={() => openEdit(link)}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        variant="danger"
                        className="min-w-0 px-2 text-[11px] tracking-[0.08em] sm:px-5 sm:text-[13px] sm:tracking-[0.12em]"
                        onClick={() => {
                          setDeleteError("");
                          setDeleting(link);
                        }}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title={t("delete")}
          message={t("confirmDeleteShopLink")}
          onClose={() => setDeleting(null)}
          onConfirm={confirmRemove}
          busy={deleteBusy}
          error={deleteError}
        />
      )}

      {editing && (
        <Modal
          title={editing === "new" ? t("newShopLink") : t("edit")}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save} className="space-y-5">
            <Input
              label={t("titleEn")}
              required
              value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
            />
            <Input
              label={t("titleHe")}
              required
              value={form.titleHe}
              onChange={(e) => setForm({ ...form, titleHe: e.target.value })}
            />
            <Input
              label={t("shopCategoryEn")}
              required
              value={form.categoryEn}
              onChange={(e) => setForm({ ...form, categoryEn: e.target.value })}
            />
            <Input
              label={t("shopCategoryHe")}
              required
              value={form.categoryHe}
              onChange={(e) => setForm({ ...form, categoryHe: e.target.value })}
            />
            <Input
              label={t("shopName")}
              required
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            />
            <Input
              label={t("productUrl")}
              required
              type="url"
              value={form.productUrl}
              onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
            />
            <Input
              label={t("imageUrl")}
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            <Input
              label={t("price")}
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <div className="grid gap-5 sm:grid-cols-3">
              <Input
                label={t("utmSource")}
                required
                value={form.utmSource}
                onChange={(e) => setForm({ ...form, utmSource: e.target.value })}
              />
              <Input
                label={t("utmMedium")}
                required
                value={form.utmMedium}
                onChange={(e) => setForm({ ...form, utmMedium: e.target.value })}
              />
              <Input
                label={t("utmCampaign")}
                value={form.utmCampaign}
                onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })}
              />
            </div>
            <Input
              label={t("shopLinkSort")}
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
            {previewUrl && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  {t("attributedLinkPreview")}
                </p>
                <p className="break-all rounded border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600">
                  {previewUrl}
                </p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-clay-600"
              />
              {t("active")}
            </label>
            {error && <ErrorNote message={error} />}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
                {t("save")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
