from __future__ import annotations

import re
from dataclasses import dataclass, field
import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# Configuration


# How the day's calorie target is split across slots. 

SLOT_FRACTIONS: dict[str, float] = {
    "breakfast": 0.25,
    "lunch": 0.35,
    "dinner": 0.30,
    "snack": 0.10,
}

BAND_LOW, BAND_HIGH = 0.60, 1.40

# How much protein fit counts against taste when ranking a slot's options.
PROTEIN_WEIGHT = 0.4

# Ratings are centred here: 5* -> +2 (strong pull), 1* -> -2 (strong push).
RATING_CENTRE = 3
DISLIKE_MAX = 2

# The Epicurious data contains clear errors (a recipe claiming 30 million calories). These bounds keep only physically plausible recipes.
CAL_MIN, CAL_MAX = 20.0, 2000.0
PROT_MIN, PROT_MAX = 0.0, 200.0

# Measurement / prep words that carry no flavour signal and shouldn't become TF-IDF terms.
STOPWORDS = set(
    """
cup cups tablespoon tablespoons tbsp teaspoon teaspoons tsp ounce ounces oz
pound pounds lb lbs gram grams kg ml liter liters pinch dash clove cloves can
cans package packages slice slices piece pieces large small medium chopped
diced sliced minced fresh freshly ground peeled cored seeded canned jarred
bottled frozen dried packed drained rinsed cooked uncooked raw boneless skinless
""".split()
)

NON_ALPHA = re.compile(r"[^a-z ]")


MEAT_WORDS = {
    "pork", "ham", "bacon", "beef", "chicken", "turkey", "lamb", "sausage",
    "duck", "veal", "prosciutto", "pancetta", "guanciale", "chorizo", "salami",
    "pepperoni", "mortadella", "bresaola", "capicola", "andouille", "kielbasa",
    "meat", "meatball", "steak", "brisket", "venison", "rabbit", "goat",
    "mutton", "poultry", "hen", "quail", "pheasant", "liver", "foie",
    "gelatin", "gelatine", "lard", "tallow", "suet", "rennet",
    "boar", "bison", "elk", "squab", "capon", "pigeon", "partridge", "ostrich",
    "emu", "kangaroo", "alligator", "frog", "snail", "escargot", "tripe",
    "sweetbread", "oxtail", "pate", "jamon", "coppa", "nduja", "soppressata",
    "cotechino", "speck", "tasso", "pastrami", "frankfurter", "wiener",
    "bologna", "gizzard", "giblet", "sirloin", "ribeye", "tenderloin", "sopressata",
    "goose",
}
FISH_WORDS = {
    "fish", "salmon", "tuna", "shrimp", "prawn", "crab", "lobster", "clam",
    "mussel", "oyster", "scallop", "anchovy", "anchovies", "sardine", "cod",
    "halibut", "trout", "tilapia", "squid", "octopus", "calamari", "herring",
    "mackerel", "snapper", "catfish", "crawfish", "crayfish", "caviar", "eel",
    "seafood", "haddock", "swordfish", "mahi",
    "branzino", "orata", "dorade", "dorada", "turbot", "monkfish", "flounder",
    "grouper", "pompano", "bream", "hake", "pollock", "pollack", "mullet",
    "barramundi", "sablefish", "sturgeon", "whitefish", "langoustine",
    "langostino", "cuttlefish", "abalone", "cockle", "whelk", "scampi",
    "bottarga", "surimi", "uni", "kipper", "bass", "sole",
    "bluefish", "rockfish", "codfish", "shellfish", "crabmeat", "crawdad",
}

# unrelated words ("egg" still won't fire on "eggplant").
MEAT_RE = re.compile(r"\b(" + "|".join(re.escape(w) for w in MEAT_WORDS) + r")s?\b")
FISH_RE = re.compile(r"\b(" + "|".join(re.escape(w) for w in FISH_WORDS) + r")s?\b")

# Category tags used ONLY to exclude (not to include). 

MEAT_TAGS = frozenset({
    "Beef", "Pork", "Chicken", "Turkey", "Lamb", "Veal", "Duck", "Meat",
    "Poultry", "Bacon", "Ham", "Sausage", "Goose", "Rabbit", "Buffalo",
    "Venison", "Game", "Brisket", "Steak", "Quail", "Prosciutto", "Goat",
    "Ground Beef", "Ground Lamb", "Pork Rib", "Beef Rib", "Beef Tenderloin",
    "Pancetta", "Hot Dog",
})
FISH_TAGS = frozenset({
    "Fish", "Seafood", "Shellfish", "Salmon", "Tuna", "Cod", "Halibut",
    "Trout", "Bass", "Snapper", "Shrimp", "Crab", "Lobster", "Clam", "Mussel",
    "Oyster", "Scallop", "Squid", "Octopus", "Anchovy", "Sardine", "Caviar",
})
ALLERGENS: dict[str, set[str]] = {
    "dairy": {"milk", "butter", "cream", "cheese", "yogurt", "yoghurt", "ghee",
              "buttermilk", "custard", "paneer", "curd", "mascarpone", "ricotta",
              "parmesan", "mozzarella"},
    "lactose": {"milk", "butter", "cream", "cheese", "yogurt", "yoghurt", "ghee",
                "buttermilk", "custard"},
    "gluten": {"flour", "bread", "pasta", "wheat", "barley", "rye", "couscous",
               "semolina", "breadcrumb", "cracker", "noodle", "panko"},
    "shellfish": {"shrimp", "prawn", "crab", "crabmeat", "lobster", "clam", "mussel",
                  "oyster", "scallop", "squid", "calamari", "crawfish", "crayfish",
                  "langoustine"},
    "peanut": {"peanut", "groundnut"},
    "egg": {"egg", "meringue", "aioli"},
    "soy": {"soy", "soya", "tofu", "edamame", "miso", "tempeh"},
    "nuts": {"almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut",
                "macadamia", "praline"},
}

# Drinks are excluded from meal plans by default — a smoothie or cocktail
# isn't a meal. Matched on the title. The negative lookahead lets through
DRINK_RE = re.compile(
    r"\b(cocktail|margarita|martini|latte|lemonade|sangria|mojito|"
    r"daiquiri|colada|spritzer|julep|mimosa|negroni|eggnog|mulled|"
    r"highball|frappe|shrub|mocktail|punch|tonic)\b",
    re.IGNORECASE,
)
# If a drink word co-occurs with any of these, it's a food, not a drink.
NOT_A_DRINK = re.compile(
    r"\b(cake|pie|bread|muffin|cookie|tart|roast|chop|braised|marinated|"
    r"chicken|pork|beef|fish|salad|soup|pasta|rice|stew|casserole)\b",
    re.IGNORECASE,
)

def is_drink(title: str) -> bool:
    return bool(DRINK_RE.search(title)) and not NOT_A_DRINK.search(title)

def clean_ing(lines: list[str]) -> str:
    """Messy ingredient lines -> a bag of meaningful ingredient words.

    "2 tbsp butter, melted" -> "butter". Drops numbers, units and prep words,
    lowercases, so the same ingredient always looks the same to the model.
    """
    words: list[str] = []
    for line in lines:
        line = NON_ALPHA.sub(" ", line.lower())
        for word in line.split():
            if len(word) > 2 and word not in STOPWORDS:
                words.append(word)
    return " ".join(words)



# Results                                                                

@dataclass
class Meal:
    slot: str
    recipe_id: int
    title: str
    calories: float
    protein: float
    explanation: str


@dataclass
class DayPlan:
    # Maps a slot name (like 'breakfast') to a list of Meal options
    meals: dict[str, list[Meal]] = field(default_factory=dict)
    cold_start: bool = False  # True when the user has no usable ratings yet

    def as_dict(self) -> dict:
        return {
            "meals": {
                slot: [m.__dict__ for m in options]
                for slot, options in self.meals.items()
            },
            "cold_start": self.cold_start,
        }


# The engine 

class Recommender:
    """In-memory content-based recommender. Build once, query many times."""

    def __init__(
        self,
        *,
        ids: np.ndarray,
        titles: list[str],
        calories: np.ndarray,
        protein: np.ndarray,
        fat: np.ndarray,
        sodium: np.ndarray,
        categories: list[frozenset[str]],
        ingredient_blobs: list[str],
        has_meat: np.ndarray,
        has_fish: np.ndarray,
        source_rating: np.ndarray,
        matrix: sparse.csr_matrix,
        vectorizer: TfidfVectorizer,
        ingredients: list[list[str]],
        directions: list[list[str]],
    ):
        self.ids = ids
        self.titles = titles
        self.calories = calories
        self.protein = protein
        self.fat = fat
        self.sodium = sodium
        self.categories = categories
        self.ingredient_blobs = ingredient_blobs
        self.has_meat = has_meat
        self.has_fish = has_fish
        self.source_rating = source_rating
        self.matrix = matrix
        self.vectorizer = vectorizer
        self.ingredients = ingredients
        self.directions = directions
        self.feature_names = np.asarray(vectorizer.get_feature_names_out())
        self.id_to_row = {int(rid): i for i, rid in enumerate(ids)}
        self.n = matrix.shape[0]

    # construction

    @classmethod
    def from_records(cls, records: list[dict]) -> "Recommender":
        """Sanitize, vectorise, and build the engine from raw recipe records."""
        ids: list[int] = []
        titles: list[str] = []
        calories: list[float] = []
        protein: list[float] = []
        fat: list[float] = []
        sodium: list[float] = []
        categories: list[frozenset[str]] = []
        ingredient_blobs: list[str] = []
        source_rating: list[float] = []
        documents: list[str] = []
        ingredients: list[list[str]] = []
        directions: list[list[str]] = []

        seen_titles = set()

        for position, r in enumerate(records):
            # Required fields — skip anything the app can't use.
            title = (r.get("title") or "").strip()
            if not title or title.lower() in seen_titles:
                continue
            seen_titles.add(title.lower())

            recipe_ingredients = r.get("ingredients")
            recipe_directions = r.get("directions")
            cal = r.get("calories")
            prot = r.get("protein")
            if not (title and recipe_ingredients and recipe_directions and cal is not None and prot is not None):
                continue
            if is_drink(title):
                continue
            # Nutrition sanity gate.
            try:
                cal = float(cal)
                prot = float(prot)
            except (TypeError, ValueError):
                continue
            if not (CAL_MIN <= cal <= CAL_MAX and PROT_MIN <= prot <= PROT_MAX):
                continue

            cats = frozenset(r.get("categories") or [])
            ingredient_text = clean_ing(recipe_ingredients)
            tag_text = " ".join(t.lower().replace(" ", "_") for t in cats)

            ids.append(int(r["id"]) if r.get("id") is not None else position)
            titles.append(title)
            calories.append(cal)
            protein.append(prot)
            fat.append(num(r.get("fat")))
            sodium.append(num(r.get("sodium")))
            categories.append(cats)
            blob = " ".join(recipe_ingredients).lower()
            ingredient_blobs.append(blob)
            ingredients.append(recipe_ingredients)
            directions.append(recipe_directions)
            source_rating.append(num(r.get("rating")))
            documents.append(ingredient_text + " " + tag_text)

        if not documents:
            raise ValueError("No usable recipes to build the recommender from.")

        # Classify diet from title + ingredients, once, at build time (so the
        # per-request diet filter is a plain boolean-array lookup).
         
        diet_text = [t.lower() + " " + b for t, b in zip(titles, ingredient_blobs)]
        has_meat = np.fromiter(
            (bool(MEAT_RE.search(x)) or bool(cats & MEAT_TAGS)
             for x, cats in zip(diet_text, categories)),
            dtype=bool, count=len(diet_text),
        )
        has_fish = np.fromiter(
            (bool(FISH_RE.search(x)) or bool(cats & FISH_TAGS)
             for x, cats in zip(diet_text, categories)),
            dtype=bool, count=len(diet_text),
        )

        vectorizer = TfidfVectorizer(min_df=5, max_df=0.5, stop_words="english")
        matrix = vectorizer.fit_transform(documents)

        return cls(
            ids=np.asarray(ids),
            titles=titles,
            calories=np.asarray(calories, dtype=float),
            protein=np.asarray(protein, dtype=float),
            fat=np.asarray(fat, dtype=float),
            sodium=np.asarray(sodium, dtype=float),
            categories=categories,
            ingredient_blobs=ingredient_blobs,
            has_meat=has_meat,
            has_fish=has_fish,
            source_rating=np.asarray(source_rating, dtype=float),
            matrix=matrix.tocsr(),
            vectorizer=vectorizer,
            ingredients=ingredients,
            directions=directions,
        )
    
    def get_recipe_details(self, recipe_id: int) -> dict | None:
        row = self.id_to_row.get(recipe_id)
        if row is None:
            return None
            
        return {
            "recipe_id": recipe_id,
            "title": self.titles[row],
            "ingredients": self.ingredients[row],
            "directions": self.directions[row],
            "calories": float(self.calories[row]),
            "protein": float(self.protein[row])
        }

    # taste & scoring

    def taste_vector(self, ratings: list[tuple[int, int]]):
        """Rating-weighted sum of the user's rated recipe vectors.

        weight = stars - 3, so a 5* pulls with +2 and a 1* pushes with -2.
        Returns None when the user has rated nothing we know about.
        """
        acc = None
        for recipe_id, stars in ratings:
            row = self.id_to_row.get(int(recipe_id))
            if row is None:
                continue
            weight = stars - RATING_CENTRE
            if weight == 0:
                continue 
            contribution = self.matrix[row] * weight
            acc = contribution if acc is None else acc + contribution
        return acc

    def scores(self, taste) -> np.ndarray:
        """Similarity of every recipe to the user's taste.

        Cold start (no taste vector) falls back to the dataset's own rating,
        i.e. a sensible popular-first ordering until the first rating lands.
        """
        if taste is None or taste.nnz == 0:
            return self.source_rating
        return cosine_similarity(taste, self.matrix).ravel()

    # filtering 

    def diet_mask(self, diet) -> np.ndarray:
        """Boolean mask of recipes allowed by the diet.

        Classified from ingredients, not the datasets diet tags:
        """
        if not diet or diet == "non_vegetarian":
            return np.ones(self.n, dtype=bool)
        if diet == "vegetarian":
            return ~self.has_meat & ~self.has_fish
        if diet == "pescatarian":
            return ~self.has_meat
        return np.ones(self.n, dtype=bool)

    def allergy_mask(self, allergies: list[str]) -> np.ndarray:
        """True where the recipe contains NONE of the allergens.
        Category allergens ("dairy") are expanded into the ingredient words
        recipes actually use ("butter", "cream"). Unknown/custom entries fall
        back to literal matching. Word-boundary regex throughout, so "egg"
        still doesn't trip on "eggplant".
        """
        if not allergies:
            return np.ones(self.n, dtype=bool)

        words: set[str] = set()
        for a in allergies:
            a = a.lower().strip()
            if not a:
                continue
            words |= ALLERGENS.get(a, {a})

        if not words:
            return np.ones(self.n, dtype=bool)

        pattern = re.compile(
            r"\b(" + "|".join(re.escape(w) for w in sorted(words)) + r")s?\b"
        )
        return np.fromiter(
            (not pattern.search(blob) for blob in self.ingredient_blobs),
            dtype=bool,
            count=self.n,
        )

    def base_eligible(self, prefs: dict, ratings: list[tuple[int, int]]) -> np.ndarray:
        """Diet + allergy + 'never serve what they disliked', as one mask."""
        mask = self.diet_mask(prefs.get("diet_type"))
        mask &= self.allergy_mask(prefs.get("allergies") or [])
        # Hard-exclude anything the user rated at or below the dislike threshold.
        for recipe_id, stars in ratings:
            if stars <= DISLIKE_MAX:
                row = self.id_to_row.get(int(recipe_id))
                if row is not None:
                    mask[row] = False
        return mask

    # the day 

    def recommend_day(self, prefs: dict, ratings:  list[tuple[int, int]] = None , num_options: int = 3) -> DayPlan:
        
        """Assemble multiple options for breakfast, lunch, dinner and a snack.
        prefs: {diet_type, daily_cal_goal, daily_prot_goal, allergies: [...]}
        ratings: [(recipe_id, stars), ...]  (may be empty / None)
        """
        ratings = ratings or []
        daily_cal = float(prefs.get("daily_cal_goal") or 2000)
        daily_prot = float(prefs.get("daily_prot_goal") or 0)

        taste = self.taste_vector(ratings)
        cold = taste is None or taste.nnz == 0
        scores = self.scores(taste)
        eligible = self.base_eligible(prefs, ratings)

        used: set[int] = set()  
        plan = DayPlan(cold_start=cold)

        for slot, frac in SLOT_FRACTIONS.items():
            slot_target = daily_cal * frac
            rows = self.pick_multiple_for_slot(
                slot_target, daily_prot * frac, eligible, scores, used, num_options
            )
            
            plan.meals[slot] = []
            for row in rows:
                used.add(row)
                plan.meals[slot].append(self.make_meal(slot, row, taste, cold))

        return plan
    
    def pick_multiple_for_slot(self, slot_target: float, prot_target: float, eligible: np.ndarray, scores: np.ndarray, used: set[int], num_options: int) -> list[int]:

        """Returns the top N eligible recipes in the calorie band, ranked on taste and protein fit."""

        lo, hi = slot_target * BAND_LOW, slot_target * BAND_HIGH
        in_band = eligible & (self.calories >= lo) & (self.calories <= hi)
        candidates = np.flatnonzero(in_band)
        candidates = np.array([c for c in candidates if c not in used], dtype=int)

        if candidates.size:
            # Blend taste with protein fit (both 0..1); protein fit maxes out once the slot target is met.
            taste = scores[candidates].astype(float)
            spread = taste.max() - taste.min()
            taste_fit = (taste - taste.min()) / spread if spread > 0 else np.zeros_like(taste)
            prot_fit = np.clip(self.protein[candidates] / prot_target, 0, 1) if prot_target > 0 else np.zeros_like(taste)
            combined = (1 - PROTEIN_WEIGHT) * taste_fit + PROTEIN_WEIGHT * prot_fit
            best_indices = np.argsort(combined)[::-1][:num_options]
            return [int(c) for c in candidates[best_indices]]

        # Fallback: nearest calories among all eligible, unused recipes
        pool = np.flatnonzero(eligible)
        pool = np.array([c for c in pool if c not in used], dtype=int)
        if not pool.size:
            return []
            
        # Sort by closest calorie match and take the top N
        nearest_indices = np.argsort(np.abs(self.calories[pool] - slot_target))[:num_options]
        return [int(c) for c in pool[nearest_indices]]

    # explanations & assembly 

    def make_meal(self, slot: str, row: int, taste, cold: bool) -> Meal:
        return Meal(
            slot=slot,
            recipe_id=int(self.ids[row]),
            title=self.titles[row],
            calories=round(float(self.calories[row]), 1),
            protein=round(float(self.protein[row]), 1),
            explanation=self.explain(row, slot, taste, cold),
        )

    def explain(self, row: int, slot: str, taste, cold: bool) -> str:
        """Why this recipe is here: hard-rule facts + shared taste terms."""
        facts = [
            f"fits your {slot} calories (~{self.calories[row]:.0f} cal)",
            f"{self.protein[row]:.0f} g protein",
        ]
        if cold or taste is None or taste.nnz == 0:
            facts.append("a popular pick to start — rate it to personalise")
            return "; ".join(facts)

        # Shared TF-IDF terms between this recipe and the taste vector.
        recipe_arr = self.matrix[row].toarray().ravel()
        taste_arr = np.asarray(taste.todense()).ravel()
        overlap = recipe_arr * np.clip(taste_arr, 0, None)  # only liked directions
        top = overlap.argsort()[::-1][:3]
        terms = [self.feature_names[i] for i in top if overlap[i] > 0]
        if terms:
            facts.append("shares " + ", ".join(terms) + " with dishes you rated well")
        return "; ".join(facts)

def num(value) -> float:
    """Coerce to float, mapping missing/garbage to 0.0."""
    try:
        f = float(value)
        return f if np.isfinite(f) else 0.0
    except (TypeError, ValueError):
        return 0.0