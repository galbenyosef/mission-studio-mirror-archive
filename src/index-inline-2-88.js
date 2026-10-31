// index-inline-2 88 — label
// Lines 25434-25903 of readable/index-inline-2.pretty.js (statement-aligned).
function fieldsFor(cfg, scn) {
  const F = [];
  const SC = SPACECRAFT[cfg.spacecraft];
  const lunar = (cfg.profile || "").startsWith("lunar");
  const grp = (title, ...items) =>
    F.push({ group: title, items: items.filter(Boolean) });
  const launchers = Object.entries(LAUNCHERS)
    .filter(([k, L]) =>
      SC.usesUpperStage
        ? k === "starship"
        : SC.winged
          ? !!L.sideMount
          : k !== "starship" && !L.sideMount,
    )
    .map(([k, L]) => [k, `${L.name} — ${L.org}`]);
  if (isLEO(cfg)) return fieldsLEO(cfg, SC, launchers, grp, F);
  grp(
    "Launch",
    {
      path: "launcher",
      label: "Launch vehicle",
      type: "select",
      options: launchers,
      wide: true,
      onSet: (c) => {
        delete c.launchAz;
      },
    },
    {
      path: "site",
      label: "Launch site",
      type: "select",
      options: Object.entries(LAUNCH_SITES).map(([k, s]) => [k, s.name]),
      wide: true,
      onSet: (c) => {
        delete c.launchAz;
      },
    },
    {
      path: "launch",
      label: "Liftoff (UTC)",
      type: "datetime",
      wide: true,
      onSet: (c, v, old) => {
        delete c.launchAz;
      },
    },
    {
      path: "parking.hp",
      label: "Parking orbit perigee",
      unit: "km",
      type: "number",
      min: 150,
      max: 1000,
      step: 1,
    },
    {
      path: "parking.ha",
      label: "Parking orbit apogee",
      unit: "km",
      type: "number",
      min: 150,
      max: 60000,
      step: 1,
    },
  );
  grp(
    "Crew & payload",
    { path: "name", label: "Mission name", type: "text", wide: true },
    { path: "shipName", label: "Spacecraft name", type: "text", wide: true },
    SC.crewMax > 0 && {
      path: "crew",
      label: "Crew",
      type: "number",
      min: 1,
      max: SC.crewMax,
      step: 1,
      unit: `max ${SC.crewMax}`,
    },
    cfg.payloadMass != null && {
      path: "payloadMass",
      label: "Habitat + cargo mass",
      unit: "kg",
      type: "number",
      min: 10000,
      max: 200000,
      step: 1000,
    },
    cfg.refill && {
      path: "refill.tankers",
      label: "Tanker flights",
      type: "number",
      min: 0,
      max: 20,
      step: 1,
      onSet: (c, v) => {
        c.refill.to = Math.min(1500000, Math.round(80000 + v * 150000));
      },
    },
    cfg.refill && {
      path: "refill.to",
      label: "Propellant after refilling",
      unit: "kg",
      type: "number",
      min: 0,
      max: 1500000,
      step: 10000,
    },
    cfg.isru && {
      path: "isru.to",
      label: "Propellant made on Mars (ISRU)",
      unit: "kg",
      type: "number",
      min: 0,
      max: 1500000,
      step: 10000,
    },
  );
  if (lunar) {
    grp(
      "To the Moon",
      cfg.tliMET != null && {
        path: "tliMET",
        label: "Trans-lunar injection",
        unit: "h after liftoff",
        type: "number",
        min: 1.5,
        max: 6,
        step: 0.01,
      },
      cfg.heo && {
        path: "heo.ha",
        label: "High Earth orbit apogee",
        unit: "km",
        type: "number",
        min: 20000,
        max: 100000,
        step: 100,
      },
      {
        path: "tof",
        label: "Earth → Moon flight time",
        unit: "h",
        type: "number",
        min: 55,
        max: 130,
        step: 0.1,
      },
      {
        path: "perilune",
        label:
          cfg.profile === "lunar-flyby"
            ? "Closest approach to the Moon"
            : "Arrival perilune altitude",
        unit: "km",
        type: "number",
        min: 60,
        max: 20000,
        step: 1,
      },
      cfg.loi && {
        path: "loi.circ",
        label: "Lunar orbit altitude",
        unit: "km",
        type: "number",
        min: 60,
        max: 500,
        step: 1,
        onSet: (c, v) => {
          if (c.perilune < v * 0.6) c.perilune = v;
        },
      },
      cfg.loi && {
        path: "loi.apo",
        label: "Initial capture apolune",
        unit: "km",
        type: "number",
        min: 100,
        max: 10000,
        step: 1,
      },
    );
    if (cfg.landing)
      grp(
        "Lunar landing",
        {
          kind: "preset",
          label: "Landing site",
          list: MOON_SITES,
          path: "landing",
          wide: true,
        },
        {
          path: "landing.lat",
          label: "Latitude",
          unit: "°N",
          type: "number",
          min: -60,
          max: 60,
          step: 0.001,
        },
        {
          path: "landing.lon",
          label: "Longitude",
          unit: "°E",
          type: "number",
          min: -180,
          max: 180,
          step: 0.001,
        },
        {
          path: "landMET",
          label: "Touchdown",
          unit: "h after liftoff",
          type: "number",
          min: 60,
          max: 400,
          step: 0.01,
          onSet: (c, v, old) => {
            const d = v - old;
            for (const k of ["undockMET", "pdiMET", "ascentMET", "teiMET"])
              if (c[k] != null) c[k] = +(c[k] + d).toFixed(3);
          },
        },
        {
          kind: "calc",
          label: "Surface stay",
          unit: "h",
          get: (c) => +(c.ascentMET - c.landMET).toFixed(2),
          set: (c, v) => {
            const old = c.ascentMET;
            c.ascentMET = +(c.landMET + v).toFixed(3);
            if (c.teiMET != null)
              c.teiMET = +(c.teiMET + (c.ascentMET - old)).toFixed(3);
          },
          min: 2,
          max: 400,
          step: 0.1,
        },
      );
    grp(
      "Home",
      cfg.teiMET != null && {
        path: "teiMET",
        label: "Trans-Earth injection",
        unit: "h after liftoff",
        type: "number",
        min: 70,
        max: 600,
        step: 0.01,
      },
      cfg.returnTof != null && {
        path: "returnTof",
        label: "Moon → Earth flight time",
        unit: "h",
        type: "number",
        min: 50,
        max: 120,
        step: 0.1,
      },
      {
        kind: "preset",
        label: "Splashdown / landing zone",
        list: EARTH_SITES,
        path: "splash",
        wide: true,
      },
      {
        path: "splash.lat",
        label: "Latitude",
        unit: "°N",
        type: "number",
        min: -60,
        max: 60,
        step: 0.01,
      },
      {
        path: "splash.lon",
        label: "Longitude",
        unit: "°E",
        type: "number",
        min: -180,
        max: 180,
        step: 0.01,
      },
      {
        path: "entry.fpa",
        label: "Entry flight-path angle",
        unit: "°",
        type: "number",
        min: -8,
        max: -5,
        step: 0.01,
      },
    );
  } else {
    (cfg.legs || []).forEach((leg, i) => {
      const P = `legs.${i}.`;
      const body = BODIES[leg.body].name;
      const ret = leg.body === "earth" && leg.departMars;
      const title =
        leg.type === "flyby"
          ? `${body} flyby`
          : leg.type === "orbit"
            ? `${body} orbit`
            : leg.type === "entry"
              ? ret
                ? "Return to Earth"
                : `${body} entry & landing`
              : `${body} (design point)`;
      const items = [];
      if (ret)
        items.push({
          path: P + "departMars",
          label: "Leave Mars (UTC)",
          type: "datetime",
          wide: true,
        });
      items.push({
        path: P + "t",
        label:
          leg.type === "entry"
            ? `Atmospheric entry (UTC)`
            : leg.type === "flyby"
              ? "Closest approach (UTC)"
              : "Arrival (UTC)",
        type: "datetime",
        wide: true,
        onSet: (c, v, old) => {
          if (leg.tLand && old) {
            const d = isoToT(v) - isoToT(old);
            c.legs[i].tLand = new Date(
              (isoToT(c.legs[i].tLand) + d + J2000_UNIX) * 1000,
            )
              .toISOString()
              .replace(".000", "");
          }
        },
      });
      if (leg.type === "flyby")
        items.push(
          leg.alt != null
            ? {
                path: P + "alt",
                label: "Flyby altitude",
                unit: "km",
                type: "number",
                min: 100,
                max: 200000,
                step: 1,
              }
            : {
                path: P + "minAlt",
                label: "Minimum flyby altitude",
                unit: "km",
                type: "number",
                min: 100,
                max: 20000,
                step: 1,
              },
        );
      if (leg.type === "orbit")
        items.push(
          {
            path: P + "alt",
            label: "Capture periapsis altitude",
            unit: "km",
            type: "number",
            min: 150,
            max: 5000,
            step: 1,
          },
          {
            path: P + "apo",
            label: "Capture apoapsis altitude",
            unit: "km",
            type: "number",
            min: 1000,
            max: 300000,
            step: 100,
          },
          {
            path: P + "incl",
            label: "Arrival inclination",
            unit: "°",
            type: "number",
            min: 0,
            max: 180,
            step: 0.1,
          },
        );
      if (leg.site && leg.body === "mars")
        items.push(
          {
            kind: "preset",
            label: "Landing site",
            list: MARS_SITES,
            path: P + "site",
            wide: true,
          },
          {
            path: P + "site.lat",
            label: "Latitude",
            unit: "°N",
            type: "number",
            min: -60,
            max: 60,
            step: 0.001,
          },
          {
            path: P + "site.lon",
            label: "Longitude",
            unit: "°E",
            type: "number",
            min: -180,
            max: 180,
            step: 0.001,
          },
        );
      if (leg.next === "land" && leg.tLand)
        items.push({
          path: P + "tLand",
          label: "Landing (UTC)",
          type: "datetime",
          wide: true,
        });
      if (leg.site && leg.body === "earth")
        items.push(
          {
            kind: "preset",
            label: "Landing zone",
            list: EARTH_SITES,
            path: P + "site",
            wide: true,
          },
          {
            path: P + "site.lat",
            label: "Latitude",
            unit: "°N",
            type: "number",
            min: -60,
            max: 60,
            step: 0.01,
          },
          {
            path: P + "site.lon",
            label: "Longitude",
            unit: "°E",
            type: "number",
            min: -180,
            max: 180,
            step: 0.01,
          },
        );
      if (leg.entry && leg.entry.fpa != null)
        items.push({
          path: P + "entry.fpa",
          label: "Entry flight-path angle",
          unit: "°",
          type: "number",
          min: -20,
          max: -4,
          step: 0.1,
        });
      grp(title, ...items);
    });
  }
  return F;
}
// Space Shuttle flights: launch, orbit, payload and the runway landing
