/* eslint-disable react/no-array-index-key */
import useSWR, { SWRConfig } from "swr";
import Head from "next/head";
import dynamic from "next/dynamic";
import classNames from "classnames";
import { useTranslation } from "next-i18next";
import { useEffect, useContext, useState } from "react";
import { BiError } from "react-icons/bi";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { signIn, signOut, useSession } from 'next-auth/client';
import { useRouter } from 'next/router'

import ServicesGroup from "components/services/group";
import BookmarksGroup from "components/bookmarks/group";
import Widget from "components/widgets/widget";
import Revalidate from "components/toggles/revalidate";
import createLogger from "utils/logger";
import useWindowFocus from "utils/hooks/window-focus";
import { getSettings } from "utils/config/config";
import { ColorContext } from "utils/contexts/color";
import { ThemeContext } from "utils/contexts/theme";
import { SettingsContext } from "utils/contexts/settings";
import { bookmarksResponse, servicesResponse, widgetsResponse } from "utils/config/api-response";
import ErrorBoundary from "components/errorboundry";
import themes from "utils/styles/themes";
import QuickLaunch from "components/quicklaunch";

const ThemeToggle = dynamic(() => import("components/toggles/theme"), {
  ssr: false,
});

const ColorToggle = dynamic(() => import("components/toggles/color"), {
  ssr: false,
});

const rightAlignedWidgets = ["weatherapi", "openweathermap", "weather", "openmeteo", "search", "datetime"];
async function filterBookmarks(bookmarks, filter) {
  let bks = bookmarks.reduce(function (filtered, bookmark) {
    let bk = bookmark.bookmarks.filter(item => {
      if (item.tags == undefined || filter == undefined)
        return true
      return item.tags?.includes(filter)
    })
    if (bk.length > 0) {
      filtered.push({
        name: bookmark.name,
        bookmarks: bk
      })
    }
    return filtered;
  }, []);
  return bks
}

export async function getStaticProps() {
  let logger;
  try {
    logger = createLogger("index");
    const { providers, ...settings } = getSettings();

    const services = await servicesResponse();
    const widgets = await widgetsResponse();
    const { query } = useRouter();
    const { filter } = query;
    const bookmarks = await bookmarksResponse(filter);
    return {
      props: {
        initialSettings: settings,
        fallback: {
          "/api/services": services,
          "/api/bookmarks": bookmarks,
          "/api/widgets": widgets,
          "/api/hash": false,
        },
        ...(await serverSideTranslations(settings.language ?? "en")),
      },
    };
  } catch (e) {
    if (logger) {
      logger.error(e);
    }
    return {
      props: {
        initialSettings: {},
        fallback: {
          "/api/services": [],
          "/api/bookmarks": [],
          "/api/widgets": [],
          "/api/hash": false,
        },
        ...(await serverSideTranslations("en")),
      },
    };
  }
}

function Index({ initialSettings, fallback }) {
  const windowFocused = useWindowFocus();
  const [stale, setStale] = useState(false);
  const { data: errorsData } = useSWR("/api/validate");
  const { data: hashData, mutate: mutateHash } = useSWR("/api/hash");

  useEffect(() => {
    if (windowFocused) {
      mutateHash();
    }
  }, [windowFocused, mutateHash]);

  useEffect(() => {
    if (hashData) {
      if (typeof window !== "undefined") {
        const previousHash = localStorage.getItem("hash");

        if (!previousHash) {
          localStorage.setItem("hash", hashData.hash);
        }

        if (previousHash && previousHash !== hashData.hash) {
          setStale(true);
          localStorage.setItem("hash", hashData.hash);

          fetch("/api/revalidate").then((res) => {
            if (res.ok) {
              window.location.reload();
            }
          });
        }
      }
    }
  }, [hashData]);

  return (
    <SWRConfig value={{ fallback, fetcher: (resource, init) => fetch(resource, init).then((res) => res.json()) }}>
      <ErrorBoundary>
        <Home initialSettings={initialSettings} />
      </ErrorBoundary>
    </SWRConfig>
  );
}

const headerStyles = {
  boxed:
    "m-4 mb-0 sm:m-8 sm:mb-0 rounded-md shadow-md shadow-theme-900/10 dark:shadow-theme-900/20 bg-theme-100/20 dark:bg-white/5 p-3",
  underlined: "m-4 mb-0 sm:m-8 sm:mb-1 border-b-2 pb-4 border-theme-800 dark:border-theme-200/50",
  clean: "m-4 mb-0 sm:m-8 sm:mb-0",
};

function Home({ initialSettings }) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useContext(ThemeContext);
  const { color, setColor } = useContext(ColorContext);
  const { settings, setSettings } = useContext(SettingsContext);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, setSettings]);

  const { data: services } = useSWR("/api/services");
  const { query } = useRouter();
  const { filter } =query;
  const fetcher = url => fetch(filter?`${url}?filter=${filter}`:url).then(r => r.json())
  const { data: bookmarks } = useSWR("/api/bookmarks", fetcher);
  const { data: widgets } = useSWR("/api/widgets");
  const servicesAndBookmarks = [...services.map(sg => sg.services).flat(), ...bookmarks.map(bg => bg.bookmarks).flat()]
  const [session, loadingSession] = useSession();
  useEffect(() => {
    if (settings.language) {
      i18n.changeLanguage(settings.language);
    }

    if (settings.theme && theme !== settings.theme) {
      setTheme(settings.theme);
    }

    if (settings.color && color !== settings.color) {
      setColor(settings.color);
    }
  }, [i18n, settings, color, setColor, theme, setTheme]);

  const [searching, setSearching] = useState(false);
  const [searchString, setSearchString] = useState("");

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === "BODY") {
        if (String.fromCharCode(e.keyCode).match(/(\w|\s)/g) && !(e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)) {
          setSearching(true);
        } else if (e.key === "Escape") {
          setSearchString("");
          setSearching(false);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return function cleanup() {
      document.removeEventListener('keydown', handleKeyDown);
    }
  })
  
  if (session) {
    return (
      <>
        <Head>
          <title>{initialSettings.title || "Homepage"}</title>
          {initialSettings.base && <base href={initialSettings.base} />}
          {initialSettings.favicon ? (
            <>
              <link rel="apple-touch-icon" sizes="180x180" href={initialSettings.favicon} />
              <link rel="icon" href={initialSettings.favicon} />
            </>
          ) : (
            <>
              <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
              <link rel="shortcut icon" href="/homepage.ico" />
              <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=4" />
              <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=4" />
            </>
          )}
          <meta
            name="msapplication-TileColor"
            content={themes[initialSettings.color || "slate"][initialSettings.theme || "dark"]}
          />
          <meta name="theme-color" content={themes[initialSettings.color || "slate"][initialSettings.theme || "dark"]} />
        </Head>
        
        <div className="relative container m-auto flex flex-col justify-between z-10">

          <div
            className={classNames(
              "flex flex-row flex-wrap  justify-between",
              headerStyles[initialSettings.headerStyle || "underlined"]
            )}
          >
            <QuickLaunch
              servicesAndBookmarks={servicesAndBookmarks}
              searchString={searchString}
              setSearchString={setSearchString}
              isOpen={searching}
              close={setSearching}
              searchDescriptions={settings.quicklaunch?.searchDescriptions}
            />
            {widgets && (
              <>
                {widgets
                  .filter((widget) => !rightAlignedWidgets.includes(widget.type))
                  .map((widget, i) => (
                    <Widget key={i} widget={widget} />
                  ))}

                <div className="m-auto sm:ml-2 flex flex-wrap grow sm:basis-auto justify-between md:justify-end">
                  {widgets
                    .filter((widget) => rightAlignedWidgets.includes(widget.type))
                    .map((widget, i) => (
                      <Widget key={i} widget={widget} />
                    ))}
                </div>
              </>
            )}
          </div>

          {services && (
            <div className="flex flex-wrap p-4 sm:p-8 sm:pt-4 items-start pb-2">
              {services.map((group) => (
                <ServicesGroup key={group.name} services={group} layout={initialSettings.layout?.[group.name]} />
              ))}
            </div>
          )}

          {bookmarks && (
            <div className={`grow flex flex-wrap pt-0 p-4 sm:p-8 gap-2 grid-cols-1 lg:grid-cols-2 lg:grid-cols-${Math.min(6, bookmarks.length)}`}>
              {bookmarks.map((group) => (
                   <BookmarksGroup key={group.name} group={group} />
              ))}
            </div>
          )}

          <div className="flex p- pb-0 w-full justify-end">
            {!initialSettings?.color && <ColorToggle />}
            {!initialSettings?.theme && <ThemeToggle />}
            <Revalidate />
            
          </div>
          <div className="flex p- pb-0 w-full justify-end">
            <button onClick={() => signOut()}><h2 className="text-theme-800 dark:text-theme-300 text-xl font-medium">Sign out {session.user.email}</h2></button>
          </div>          
        </div>
      </>
    );
  } else {
    return (
      <div className="relative container m-auto flex flex-col justify-between z-10">
        <button type="button" onClick={() => signIn()}><h2 className="text-theme-800 dark:text-theme-300 text-xl font-medium">Sign In</h2></button>
      </div>
    );
  }
}

export default function Wrapper({ initialSettings, fallback }) {
  const wrappedStyle = {};
  if (initialSettings && initialSettings.background) {
    const opacity = initialSettings.backgroundOpacity ?? 1;
    const opacityValue = 1 - opacity;
    wrappedStyle.backgroundImage = `
      linear-gradient(
        rgb(var(--bg-color) / ${opacityValue}),
        rgb(var(--bg-color) / ${opacityValue})
      ),
      url(${initialSettings.background})`;
    wrappedStyle.backgroundPosition = "center";
    wrappedStyle.backgroundSize = "cover";
  }

  return (
    <div
      id="page_wrapper"
      className={classNames(
        "relative",
        initialSettings.theme && initialSettings.theme,
        initialSettings.color && `theme-${initialSettings.color}`
      )}
    >
      <div
        id="page_container"
        className="fixed overflow-auto w-full h-full bg-theme-50 dark:bg-theme-800 transition-all"
        style={wrappedStyle}
      >
        <Index initialSettings={initialSettings} fallback={fallback} />
      </div>
    </div>
  );
}
