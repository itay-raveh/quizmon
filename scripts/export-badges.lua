local root = app.params["root"]

if not root then error("root script parameter is required") end

local expected = {
  { slug = "daily-resolve", group = "Daily Resolve" },
  { slug = "many-paths", group = "Many Paths" },
  { slug = "world-tour", group = "World Tour" },
  { slug = "champions-instinct", group = "Champion's Instinct" },
  { slug = "perfect-form", group = "Perfect Form" },
}

local sourcePath = root .. "/art/badges.aseprite"
local outputPath = root .. "/src/assets/images/badges/"
local sprite = app.open(sourcePath)

if not sprite then error("Could not open " .. sourcePath) end
if sprite.width ~= 160 or sprite.height ~= 32 or sprite.colorMode ~= ColorMode.INDEXED then
  error("badges.aseprite must be a 160x32 indexed sprite")
end
if #sprite.frames ~= 1 or #sprite.palettes ~= 1 then
  error("badges.aseprite must contain one frame and one palette")
end
if #sprite.layers ~= #expected or #sprite.slices ~= #expected then
  error("badges.aseprite must contain five layer groups and five slices")
end

local slices = {}
for _, slice in ipairs(sprite.slices) do slices[slice.name] = slice end

for index, badge in ipairs(expected) do
  local group = sprite.layers[index]
  local slice = slices[badge.slug]
  if not group.isGroup or group.name ~= badge.group or #group.layers ~= 6 then
    error(badge.group .. " must be an ordered group of six layers")
  end
  if not slice then error("Missing slice " .. badge.slug) end
  local bounds = slice.bounds
  if bounds.x ~= (index - 1) * 32 or bounds.y ~= 0 or bounds.width ~= 32 or bounds.height ~= 32 then
    error(badge.slug .. " must occupy its assigned 32x32 cell")
  end
end

if #sprite.palettes[1] ~= 25 then error("Badge palette must contain exactly 25 entries") end

for _, badge in ipairs(expected) do
  app.command.SaveFileCopyAs {
    ui = false,
    filename = outputPath .. badge.slug .. ".png",
    slice = badge.slug,
  }
end

sprite:close()
