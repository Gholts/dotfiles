#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "fileutils"
require "set"

CASE_NAMES = [
  "Camel Case",
  "Capital Case",
  "Constant Case",
  "Dot Case",
  "Header Case",
  "Lower Case",
  "Lower First",
  "No Case",
  "Kebab Case",
  "Kebab Upper Case",
  "Pascal Case",
  "Pascal Snake Case",
  "Path Case",
  "Random Case",
  "Sentence Case",
  "Snake Case",
  "Alternating Case",
  "Swap Case",
  "Title Case",
  "Upper Case",
  "Upper First"
].freeze

ALIASES = {
  "Header Case" => %w[train dash],
  "No Case" => %w[none],
  "Kebab Case" => %w[dash slug param],
  "Random Case" => %w[random],
  "Swap Case" => %w[reverse],
  "Alternating Case" => %w[alternating sponge],
  "Constant Case" => %w[macro]
}.freeze

SKIP_PRELOWERCASE = Set.new([
  "Swap Case",
  "Alternating Case",
  "Random Case",
  "Lower First",
  "Upper First"
]).freeze

SMALL_WORDS = Set.new(%w[
  a an and as at because but by en for if in neither nor of on only or over
  per so some than that the to up upon v versus via vs when with without yet
]).freeze

WORD_SEPARATORS = Set.new(["-", "/", "—", "–", "―"]).freeze
SENTENCE_TERMINATORS = Set.new([".", "!", "?", "\n", "\r"]).freeze
TITLE_TERMINATORS = Set.new([".", "!", "?", "\n", "\r", ":", "\"", "'", "”"]).freeze

def truthy(value, default = false)
  return default if value.nil? || value == ""

  %w[1 true yes on].include?(value.to_s.downcase)
end

def env_string(name, default = "")
  value = ENV[name]
  value.nil? ? default : value
end

def alpha?(char)
  !!(char =~ /\p{L}/)
end

def lower(value)
  value.downcase
end

def upper(value)
  value.upcase
end

def split_words(value)
  result = value.strip
  result = result.gsub(/([\p{Ll}\d])(\p{Lu})/) { "#{$1}\0#{$2}" }
  result = result.gsub(/(\p{Lu})([\p{Lu}][\p{Ll}])/) { "#{$1}\0#{$2}" }
  result = result.gsub(/[^\p{L}\d]+/i, "\0")

  start_index = 0
  end_index = result.length
  start_index += 1 while start_index < end_index && result[start_index] == "\0"
  return [] if start_index == end_index

  end_index -= 1 while end_index > start_index && result[end_index - 1] == "\0"
  result[start_index...end_index].split(/\0/)
end

def split_prefix_suffix(input, options = {})
  prefix_chars = options.fetch(:prefix_characters, "")
  suffix_chars = options.fetch(:suffix_characters, "")
  chars = input.chars
  prefix_index = 0
  suffix_index = chars.length

  prefix_index += 1 while prefix_index < chars.length && prefix_chars.include?(chars[prefix_index])
  suffix_index -= 1 while suffix_index > prefix_index && suffix_chars.include?(chars[suffix_index - 1])

  [
    chars[0...prefix_index].join,
    split_words(chars[prefix_index...suffix_index].join),
    chars[suffix_index..]&.join.to_s
  ]
end

def capital_transform(word)
  chars = word.chars
  return "" if chars.empty?

  upper(chars[0]) + lower(chars[1..]&.join.to_s)
end

def pascal_transform(word, index)
  chars = word.chars
  return "" if chars.empty?

  first = chars[0]
  initial = index.positive? && first >= "0" && first <= "9" ? "_#{first}" : upper(first)
  initial + lower(chars[1..]&.join.to_s)
end

def words_case(input, options = {}, delimiter: " ", transform: :lower)
  prefix, words, suffix = split_prefix_suffix(input, options)
  mapped = words.each_with_index.map do |word, index|
    case transform
    when :lower then lower(word)
    when :upper then upper(word)
    when :capital then capital_transform(word)
    when :pascal then pascal_transform(word, index)
    when :camel then index.zero? ? lower(word) : pascal_transform(word, index)
    end
  end
  prefix + mapped.join(delimiter) + suffix
end

def no_case(input, options = {})
  words_case(input, options, delimiter: " ", transform: :lower)
end

def camel_case(input, options = {})
  words_case(input, options, delimiter: "", transform: :camel)
end

def capital_case(input, options = {})
  if truthy(ENV["preserve_punctuation"], false)
    return input.gsub(/(^|[\s\-_])(\w)/) { "#{$1}#{$2.upcase}" }
  end

  words_case(input, options, delimiter: " ", transform: :capital)
end

def constant_case(input, options = {})
  words_case(input, options, delimiter: "_", transform: :upper)
end

def dot_case(input, options = {})
  words_case(input, options, delimiter: ".", transform: :lower)
end

def header_case(input, options = {})
  words_case(input, options, delimiter: "-", transform: :capital)
end

def kebab_case(input, options = {})
  words_case(input, options, delimiter: "-", transform: :lower)
end

def pascal_case(input, options = {})
  words_case(input, options, delimiter: "", transform: :pascal)
end

def pascal_snake_case(input, options = {})
  words_case(input, options, delimiter: "_", transform: :capital)
end

def path_case(input, options = {})
  words_case(input, options, delimiter: "/", transform: :lower)
end

def snake_case(input, options = {})
  words_case(input, options, delimiter: "_", transform: :lower)
end

def lower_case(input, options = {})
  return lower(input) if truthy(ENV["preserve_punctuation"], false)

  lower(no_case(input, options))
end

def upper_case(input, options = {})
  return upper(input) if truthy(ENV["preserve_punctuation"], false)

  upper(no_case(input, options))
end

def first_alpha_case(input, mode)
  chars = input.chars
  index = chars.index { |char| alpha?(char) }
  return mode == :upper ? upper(input) : lower(input) if index.nil?

  chars[index] = mode == :upper ? upper(chars[index]) : lower(chars[index])
  chars.join
end

def alternating_case(input)
  count = 0
  input.chars.map do |char|
    next char unless alpha?(char)

    count += 1
    count.odd? ? upper(char) : lower(char)
  end.join
end

def random_case(input)
  input.chars.map do |char|
    next char unless alpha?(char)

    rand > 0.5 ? upper(char) : lower(char)
  end.join
end

def swap_case(input)
  input.chars.map do |char|
    lowered = lower(char)
    char == lowered ? upper(char) : lowered
  end.join
end

def upper_at(input, index)
  return input if index.nil? || index >= input.length

  input[0...index].to_s + upper(input[index]) + input[(index + 1)..].to_s
end

def scan_matches(input, pattern)
  matches = []
  input.scan(pattern) { matches << Regexp.last_match }
  matches
end

def configured_small_words
  exceptions = env_string(
    "exceptions",
    "iOS, iPadOS, iPhone, macOS, tvOS, watchOS"
  ).split(",").map(&:strip).reject(&:empty?)
  Set.new(SMALL_WORDS.to_a + exceptions)
end

def title_case_lib(input, sentence_case: false)
  terminators = sentence_case ? SENTENCE_TERMINATORS : TITLE_TERMINATORS
  small_words = configured_small_words
  result = +""
  new_sentence = true

  scan_matches(input, /(\S+)|\s/).each do |match|
    full = match[0]
    token = match[1]
    token_index = match.begin(0)

    unless token
      result << full
      new_sentence = true if terminators.include?(full)
      next
    end

    if token =~ /[\.#][\p{L}\p{N}]/
      acronym = token.match(/^([^\p{L}])*(?:\p{L}\.){2,}([^\p{L}])*$/)
      if acronym
        prefix = acronym[1].to_s
        suffix = acronym[2].to_s
        result << (sentence_case && !new_sentence ? token : upper_at(token, prefix.length))
        new_sentence = terminators.include?(suffix[0].to_s)
        next
      end

      result << token
      new_sentence = terminators.include?(token[-1].to_s)
      next
    end

    word_matches = scan_matches(token, /[\p{L}\p{N}]+/)
    value = token.dup
    sentence_end = false

    word_matches.each_with_index do |word_match, index|
      word = word_match[0]
      word_index = word_match.begin(0)
      next_char = token[word_index + word.length].to_s
      sentence_end = terminators.include?(next_char)

      if new_sentence
        new_sentence = false
      elsif sentence_case || word.match?(/\p{Ll}(?=\p{Lu})/)
        next
      elsif word_matches.length == 1
        if small_words.include?(word)
          final_token = token_index + token.length == input.length
          next if !final_token && !sentence_end
        end
      elsif index.positive?
        previous_char = token[word_index - 1].to_s
        next unless WORD_SEPARATORS.include?(previous_char)
        next if small_words.include?(word) && WORD_SEPARATORS.include?(next_char)
      end

      value = upper_at(value, word_index)
    end

    result << value
    new_sentence = sentence_end || terminators.include?(token[-1].to_s)
  end

  result
end

def sentence_case(input)
  title_case_lib(input, sentence_case: true)
end

def title_case(input)
  title_case_lib(input, sentence_case: false)
end

def options
  {
    prefix_characters: env_string("prefix_characters"),
    suffix_characters: env_string("suffix_characters")
  }
end

def convert_line(input, case_name)
  preserve_case = truthy(ENV["preserve_case"], true) || SKIP_PRELOWERCASE.include?(case_name)
  value = preserve_case ? input : lower(input)

  case case_name
  when "Camel Case" then camel_case(value, options)
  when "Capital Case" then capital_case(value, options)
  when "Constant Case" then constant_case(value, options)
  when "Dot Case" then dot_case(value, options)
  when "Header Case" then header_case(value, options)
  when "Lower Case" then lower_case(value, options)
  when "Lower First" then first_alpha_case(value, :lower)
  when "No Case" then no_case(value, options)
  when "Kebab Case" then kebab_case(value, options)
  when "Kebab Upper Case" then upper(kebab_case(value, options))
  when "Pascal Case" then pascal_case(value, options)
  when "Pascal Snake Case" then pascal_snake_case(value, options)
  when "Path Case" then path_case(value, options)
  when "Random Case" then random_case(value)
  when "Sentence Case" then sentence_case(value)
  when "Snake Case" then snake_case(value, options)
  when "Alternating Case" then alternating_case(value)
  when "Swap Case" then swap_case(value)
  when "Title Case" then title_case(value)
  when "Upper Case" then upper_case(value, options)
  when "Upper First" then first_alpha_case(value, :upper)
  else value
  end
end

def convert_text(input, case_name)
  input.split("\n", -1).map { |line| convert_line(line, case_name) }.join("\n")
end

def cache_dir
  ENV["alfred_workflow_cache"] ||
    File.join(Dir.home, "Library", "Caches", "com.runningwithcrayons.Alfred", "Workflow Data", "com.codex.change-case")
end

def state_path(name)
  File.join(cache_dir, "#{name}.json")
end

def load_list(name)
  values = JSON.parse(File.read(state_path(name)))
  values.select { |value| CASE_NAMES.include?(value) }
rescue Errno::ENOENT, JSON::ParserError
  []
end

def save_list(name, values)
  FileUtils.mkdir_p(cache_dir)
  File.write(state_path(name), JSON.generate(values.uniq.select { |value| CASE_NAMES.include?(value) }))
end

def enabled_cases
  configured = env_string("enabled_cases").split(",").map { |name| name.strip.downcase }.reject(&:empty?)
  cases = if configured.empty?
    CASE_NAMES
  else
    CASE_NAMES.select { |name| configured.include?(name.downcase) || configured.include?(name.gsub(/\s+/, "").downcase) }
  end

  cases.select do |name|
    env_key = name.gsub(/\s+/, "")
    truthy(ENV[env_key], true)
  end
end

def preview(text)
  value = text.gsub(/\s+/, " ").strip
  value = "(empty)" if value.empty?
  value.length > 120 ? "#{value[0, 117]}..." : value
end

def clipboard_text
  IO.popen(["/usr/bin/pbpaste"], &:read).to_s
rescue StandardError
  ""
end

def source_text(query)
  query.to_s.empty? ? clipboard_text : query.to_s
end

def ordered_cases
  pinned = load_list("pinned")
  recent = load_list("recent") - pinned
  all = enabled_cases - pinned - recent
  [pinned, recent, all]
end

def filter_items(query)
  input = source_text(query)
  if input.empty?
    return {
      items: [{
        title: "No text",
        subtitle: "Type text after keyword, use Universal Action, or copy text first.",
        valid: false
      }]
    }
  end

  pinned, recent, all = ordered_cases
  groups = [["Pinned", pinned], ["Recent", recent], ["All", all]]
  items = []

  groups.each do |group_name, names|
    names.each do |name|
      output = convert_text(input, name)
      pinned_case = group_name == "Pinned"
      items << {
        uid: "change-case.#{name}",
        title: name,
        subtitle: "#{group_name} - #{preview(output)}",
        arg: output,
        valid: true,
        match: ([name] + ALIASES.fetch(name, []) + [output]).join(" "),
        text: {
          copy: output,
          largetype: output
        },
        variables: {
          case_name: name
        },
        mods: {
          cmd: {
            arg: output,
            subtitle: "Copy to clipboard",
            variables: { case_name: name }
          },
          alt: {
            arg: name,
            subtitle: pinned_case ? "Unpin case" : "Pin case",
            variables: { case_name: name }
          }
        }
      }
    end
  end

  { items: items }
end

def record_case(output)
  name = ENV["case_name"]
  if CASE_NAMES.include?(name)
    pinned = load_list("pinned")
    recent = load_list("recent")
    save_list("recent", ([name] + (recent - [name] - pinned)).first(4 + pinned.length))
  end

  print output
end

def toggle_pin(name)
  case_name = name.to_s.empty? ? ENV["case_name"] : name.to_s
  return puts("No case selected") unless CASE_NAMES.include?(case_name)

  pinned = load_list("pinned")
  if pinned.include?(case_name)
    pinned.delete(case_name)
    save_list("pinned", pinned)
    puts "Unpinned #{case_name}"
  else
    save_list("pinned", [case_name] + pinned)
    save_list("recent", load_list("recent") - [case_name])
    puts "Pinned #{case_name}"
  end
end

mode = ARGV[0]
case mode
when "record"
  record_case(ARGV[1].to_s)
when "pin"
  toggle_pin(ARGV[1].to_s)
else
  query = ARGV[0].to_s
  puts JSON.generate(filter_items(query))
end
