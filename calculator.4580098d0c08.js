/*
To add new disease tests, this software should automatically just pick them up.
However, if the new tests has a new test inheritance type, it may need to have logic added
to account for that. See the "if inheritances[tests[i]].includes..." lines to see how.

If it has a complex inheritance like Dermatomyositis, see the translateDermaCombination function.

New coat/trait tests are more complicated.
New coat/trait tests will have to be added to the "locus_list" in CalculatorProductIndexView
in the products/views.py file. Note they should also be added to the "ignore_locus_list" in
DiseaseCalculatorProductIndexView in the same file so they don't also show up on the disease tests
page.
When choosing a single letter for the genotype, it shouldn't match one already in use in the "locus_list".
Then, the interpretation will also have to be added to the "translateCombination" function in this file
The interpretation is built as a text string, see the other examples in that function.

If the coat/trait test is also to be a added to the manual calculator (not just the user's dogs),
a section for it must be in calculator.html similar to "agoutilocus", "agoutilocusDamDiv",
"agoutilocusSireDiv". It should also be added to the "locusList" in the clearForm and
getManualGenotypes functions in this file.

If the new test includes some complex dominance, extra logic may need to be written in the
mono_hybrid_cross function in api/views.py. Otherwise a simple capitol letter for dominant
and lower case for recessive is assumed.
*/


function clearForm() {
  // Clear the entire form if Clear button clicked
  document.getElementById('coatForm').reset();
  // Deselect any checkboxes
  const locusList = ['agouti', 'as', 'b', 'co', 'd', 'e', 'eg', 'em', 'h', 'i', 'k', 'm', 's', 'cu', 'ic', 'lh1', 'lh4', 'sd'];
  for (let locus of locusList) {
      const classid = locus.concat('locusClass');
      document.querySelectorAll('.' + classid).forEach(function (element) {
          element.setAttribute("disabled", "disabled");
      });
  }
  // Clear results
    clearResults();
}

function userClearForm() {
    // Unselect dogs
    UnselectDog('user-dam');
    UnselectDog('user-sire');
    // Clear results, not needed, done in "UnselectDog"
    //clearResults();
}

function clearResults() {
    // Clear results table
    document.getElementById('results-table').style.visibility = 'hidden';
    // Clear test order for diseases
    const testOrder = document.getElementById('testOrder');
    if (testOrder) {
        testOrder.innerHTML = '';
    }
    // Clear chart
    const canvasDiv = document.querySelector("#coatChartDiv")
    canvasDiv.innerHTML = '<canvas id="coatChart"></canvas>';
}

function processForm(user) {
  // Check to make sure the selection is valid
  if(document.getElementById("agoutilocus").checked && !document.getElementById("klocus").checked) {
      alert("A locus requires K locus");
      return;
  }
  // clear the results table if it already has stuff in it
  document.getElementById("results").value = "";
  getPunnett(user).done(handlePunnett);
}

// function to change the text for the instructions if using the users dogs
function changeInstructions() {
  const userString = "<p><strong>Dogs without coat/trait tests will not appear.</strong></p>";
  const manualString = "<p><strong>The genotypes for both the dam and the sire must be chosen if the defaults are not to be used.</strong></p>"
            + '<p><div style="margin-left: 15%; margin-right: 15%">If the breed of dog you are testing is either French Bulldog, Afghan Hound, or Great Dane, the "Breed" dropdown will add tests that are only applicable for those '
            + 'breeds and their close relatives.</div></p>';
  const chkbox = document.getElementById('userChoice');
  const instructions = document.getElementById('instructions');
  if (chkbox.checked) {
      instructions.innerHTML = userString;
  }else{
      instructions.innerHTML = manualString;
  }
}


// Functions to get the genotypes depending on whether its from user accounts or manually entered
function getManualGenotypes() {
  // first, get the Dam and Sire genotypes to send
  const locusList = ['agouti', 'as', 'b', 'co', 'd', 'e', 'eg', 'em', 'h', 'i', 'k', 'm', 's', 'cu', 'ic', 'lh1', 'lh4', 'sd'];
  let damGenotypes = '';
  let sireGenotypes = '';
  for (let locus of locusList) {
      let chkLocus = locus.concat('locus');
      let chkbox = document.getElementById(chkLocus);
      if (chkbox.checked) {
          let damString = locus.concat('DamGenotype');
          damValue = document.getElementById(damString).value;
          damGenotypes += damValue;
          let sireString = locus.concat('SireGenotype');
          sireValue = document.getElementById(sireString).value;
          sireGenotypes += sireValue;
      }
  }
  return {damGenotypes, sireGenotypes};
}
function getUserGenotypes() {
  let damGenotypes = '';
  let sireGenotypes = '';
  document.querySelectorAll('input[class=userDamCheckbox]:checked').forEach(function (element) {
      damGenotypes += element.value;
  });
  document.querySelectorAll('input[class=userSireCheckbox]:checked').forEach(function (element) {
      sireGenotypes += element.value;
  });
  //Check if the genotypes have the same tests included by converting all to lower case
  // except for Agouti and IC since they have more than 2 alleles
  let damTests = damGenotypes.replaceAll("Y", 'a').replaceAll("W", "a").replaceAll("T", 'a').replaceAll("F", 'q').replaceAll("f", 'q');
  damTests = damTests.toLowerCase();
  let sireTests = sireGenotypes.replaceAll("Y", 'a').replaceAll("W", "a").replaceAll("T", 'a').replaceAll("F", 'q').replaceAll("f", 'q');
  sireTests = sireTests.toLowerCase();
  if (damTests !== sireTests) {
      alert("Tests must match on dam and sire!");
      return false;
  }
      // Check to make sure one dam and one sire are selected
    let numDams = 0;
    document.querySelectorAll(".user-dam").forEach(function (element) {
       if (element.value === "Unselect") {
           // Means this one is selected, so add to count
           numDams++;
       }
    });
    if (numDams == 0) {
        alert("One dam must be selected!");
        return;
    }
    let numSires = 0;
    document.querySelectorAll(".user-sire").forEach(function (element) {
       if (element.value === "Unselect") {
           // Means this one is selected, so add to count
           numSires++;
       }
    });
    if (numSires == 0) {
        alert("One sire must be selected!");
        return;
    }
  return {damGenotypes, sireGenotypes};
}

// Function to use so the anchor can be re-used each time
function goToAnchor(anchor) {
  let location = document.location.toString().split('#')[0];
  document.location = location + '#' + anchor;
  window.scrollBy(0,-100);
  return false;
}

// Functions to do the API request to get the combinations and phenotypes for a set of dam and sire alleles
function getPunnett(user) {
// function to do the AJAX request
  let damGenotypes = '';
  let sireGenotypes = '';
if (user){
    const Genotypes = getUserGenotypes();
    damGenotypes = Genotypes.damGenotypes;
    sireGenotypes = Genotypes.sireGenotypes;
}else{
    const Genotypes = getManualGenotypes();
    damGenotypes = Genotypes.damGenotypes;
    sireGenotypes = Genotypes.sireGenotypes;
}


  if (damGenotypes.length > 12) {
      alert("Too many tests selected, please remove some to submit. The limit is 6 tests.");
      return;
  }

  // send the form data to the API
let form = new FormData();
form.append("dam_genotypes", damGenotypes);
form.append("sire_genotypes", sireGenotypes);
return $.ajax({
  "url": "/api/v1/calculator/",
  "method": "POST",
  "timeout": 0,
  "processData": false,
  "mimeType": "multipart/form-data",
  "contentType": false,
  "data": form,
  dataType: "json",
  success: function (data) {
  }
});
}
function handlePunnett(data) {
// function to go back and process the Punnett data
  let resultsTable = document.getElementById("results-table");
  // Clear out any previous results
  $('#results').empty();
  resultsTable.style.visibility = 'visible';
  const combinations = data["combinations"];
  const phenotypes = data["phenotypes"];
  let total = 0;
  let reduced_combinations = {};
  // Need to loop through once to get the total number to output percentages
  for (const key in combinations) {
      total += combinations[key];
  }
  // Object to store the results to properly count them
  let resultsArray = {};
  for (const key in combinations) {
      // regex to pretty up the text
      let spaced = key.replace(/(.{2})/g,"$1 ");
      spaced = spaced.replace(/(\w)(\w)/g,"$1/$2");
      const translated = transliterate(spaced);
      const percent = (Math.round(((combinations[key] / total) * 100 * 100))/100).toFixed(2);
      const interpretation = translateCombination(key);
      let htmlInterpretation;
      if(interpretation.includes('ouble merle')) {
          // Highlight double merle cases in the results table
          htmlInterpretation = '<p style="background-color: #FF7F7F; margin-bottom: 0; margin-top: 0">' + percent + "% - " + translated + " - " +  interpretation + "</p>";
      } else {
          htmlInterpretation = '<p style="margin-bottom: 0; margin-top: 0">' + percent + "% - " + translated + " - " + interpretation + '</p>';
      }
      $('#results').html($('#results').html() + htmlInterpretation);

      if (resultsArray[interpretation]) {
          resultsArray[interpretation] += combinations[key];
      } else {
          resultsArray[interpretation] = combinations[key]
      }
  }
//      for (const key in resultsArray) {
//          const percent = (Math.round(((resultsArray[key] / total) * 100 * 100))/100).toFixed(2);
//          $('#interpretation').val($('#interpretation').val() + key + "\t" + percent + "%\n");
//      }
//      for (const key in phenotypes) {
//          const translated = transliterate(key);
//          let percent = (Math.round(((phenotypes[key] / total) * 100 * 100))/100).toFixed(2);
//          $('#phenotypes').val($('#phenotypes').val() + translated + "\t" + percent + "%\n");
//      }
  // Now the array is done, give it to the createChart function to draw
  createChart(resultsArray, total, "coat");
}

// function to transliterate the internal allele IDs to customer facing versions
function transliterate(word) {
  const library = {"Y":"A\u02B8", "W":"A\u02B7", "T":"A\u1D57", "a":"a",
      "S":"A\u02E2", "s":"N", "B":"B", "b":"b", "C":"CO", "c":"co",
      "D":"D", "d":"d", "E":"E", "e":"e", "G":"E\u1D4D", "g":"N",
      "M":"E\u1D50", "m":"N", "H":"h", "h":"H", "I":"I", "i":"i",
      "K":"K\u1D2E", "k":"k\u02B8", "r":"m", "R":"M", "P":"S", "p":"s\u1D56",
      "U":"Cu\u1D9C", "u":"Cu", "F":"F", "f":"F\u1D42", "q":"IC",
      "J":"SD", "j":"sd", "L":"Sh", "l":"Lh", "O":"Sh", "o":"Lh",
  }
  return word.split('').map(function (char) {
      return library[char] || char;
  }).join("");
}

// translation function for combination
function translateCombination(combination) {
  let interpretation = '';
  if (combination.includes("ee")) {
      // if ee, it's either Yellow or White, depending on I locus
      if (combination.includes("ii")) {
          interpretation = "White/Cream";
      }else{
          interpretation = "Yellow/Red";
      }
  } else {
      // Either E or no E locus
      // B locus section
      if (combination.includes("B")) {
          interpretation = "Black";
          if (interpretation.includes("Bb")) {
              interpretation += ", carries brown";
          }
      } else if (combination.includes("bb")) {
          interpretation = "Brown";
      }

      // K locus section
      if (combination.includes("K") || !combination.includes("k")) {

          // A^s locus section
          if (combination.includes("S") || combination.includes("ss")) {
              if (combination.includes("S")) {
                  if (interpretation === '') {
                      interpretation += "Carrier of saddle tan";
                  }else {
                      interpretation += " with carrier of saddle tan";
                  }
              } else {
                  if (interpretation === '') {
                      interpretation += "Not a carrier of saddle tan";
                  }else{
                      interpretation += " with not a carrier of saddle tan";
                  }
              }
          }
      } else {
          // k^y k^y
          // Agouti locus
          if (combination.includes("Y")) {
              // I locus
              if (combination.includes("ii")) {
                  if (interpretation === '') {
                      interpretation += "Cream Sable";
                  }else if (interpretation.includes("Black")) {
                      interpretation = interpretation.replace("Black", "Black-based Cream Sable");
                  }else if (interpretation.includes("Brown")) {
                      interpretation = interpretation.replace("Brown", "Brown-based Cream Sable");
                  }else{
                      interpretation += " Cream Sable";

                  }
              } else {
                  if (interpretation === '') {
                      interpretation += "Sable";
                  }else if (interpretation.includes("Black")) {
                      interpretation = interpretation.replace("Black", "Black-based Sable");
                  }else if (interpretation.includes("Brown")) {
                      interpretation = interpretation.replace("Brown", "Brown-based Sable");
                  }else{
                      interpretation += " Sable";
                  }
              }
              // A^s locus
              if (combination.includes("S")) {
                  if (interpretation === '') {
                      interpretation += "Carrier of saddle tan";
                  }else{
                      interpretation += " with carrier of saddle tan";
                  }
              } else if (combination.includes("ss")) {
                  if (interpretation === '') {
                      interpretation += "Not a carrier of saddle tan";
                  }else{
                      interpretation += " with not a carrier of saddle tan";
                  }
              }
          } else if (combination.includes("W")) {
              // I locus
              if (combination.includes("ii")) {
                  if (interpretation === '') {
                      interpretation += "Cream Wolf Sable";
                  }else if (interpretation.includes("Black")) {
                      interpretation = interpretation.replace("Black", "Black-based Cream Wolf Sable");
                  }else if (interpretation.includes("Brown")) {
                      interpretation = interpretation.replace("Brown", "Brown-based Cream Wolf Sable");
                  }else{
                      interpretation += " Cream Wolf Sable";
                  }
              } else {
                  if (interpretation === '') {
                      interpretation += "Wolf Sable";
                  }else if (interpretation.includes("Black")) {
                      interpretation = interpretation.replace("Black", "Black-based Wolf Sable");
                  }else if (interpretation.includes("Brown")) {
                      interpretation = interpretation.replace("Brown", "Brown-based Wolf Sable");
                  }else{
                      interpretation += " Wolf Sable";
                  }
              }
              // A^s locus
              if (combination.includes("S")) {
                  if (interpretation === '') {
                      interpretation += "Carrier of saddle tan";
                  }else{
                      interpretation += " with carrier of saddle tan";
                  }
              } else if (combination.includes("ss")) {
                  if (interpretation === '') {
                      interpretation += "Not a carrier of saddle tan";
                  }else{
                      interpretation += " with not a carrier of saddle tan";
                  }
              }
          } else if (combination.includes("T") || combination.includes("aa")) {
              if (combination.includes("T")) {
                  //interpretation += " Tricolor";
                  // I locus
                  if (combination.includes("ii")) {
                      if (interpretation === '') {
                          interpretation += "Cream points";
                      }else{
                          interpretation += " with Cream points";
                      }
                  } else {
                      if (interpretation === '') {
                          interpretation += "Tan points";
                      }else{
                          interpretation += " with Tan points";
                      }
                  }
              } else {
                  if (interpretation === '') {
                      interpretation += "Recessive solid";
                  }else{
                      interpretation += " recessive solid";
                  }
              }
              // A^s locus
              if (combination.includes("S")) {
                  if (interpretation === '') {
                      interpretation += "Saddle tan";
                  }else{
                      interpretation += " with saddle tan";
                  }
              } else if (combination.includes("ss")) {
                  if (interpretation === '') {
                      interpretation += "No saddle tan";
                  }else{
                      interpretation += " with no saddle tan";
                  }
              }
              // E^g locus
              if (combination.includes("G") && combination.includes("TT") && !combination.includes("M")) {
                  if (interpretation === '') {
                      interpretation += "Grizzle";
                  }else{
                      interpretation += " with Grizzle";
                  }
              }
          } else {
              // No Agouti locus
              if (interpretation === '') {
                  interpretation += "Agouti expression allowed";
              }else{
                  interpretation += " with Agouti expression allowed";
              }
          }
      }
  }

  if (interpretation === '' && combination.includes("Ee")) {
      interpretation = "Black (carries yellow/red)";
  }
  if (interpretation === '' && combination.includes("EE")) {
      interpretation = "Black";
  }

  // The rest of the independent traits
  // D locus
  if (combination.includes("dd")) {
      interpretation = "Dilute " + interpretation;
  }else if (combination.includes("Dd")) {
      if (interpretation === '') {
          interpretation += "Carries dilute";
      }else{
          interpretation += " and carries dilute";
      }
  }else{
      // If this is the only test, show the result
      if (combination === 'DD') {
          interpretation += "No dilute";
      }
  }
  // H locus
  if (combination.includes("H") || combination.includes("h")) {
      if (combination.includes("HH")) {
          if (interpretation === '') {
              interpretation += "No harlequin";
          }else{
              interpretation += " with no harlequin";
          }
      } else if (combination.includes("hh")) {
          interpretation = "Embryonic lethal";
      } else {
          if (combination.includes("R") || combination.includes("r")) {
              if (combination.includes("Rr")) {
                  if (interpretation === '') {
                      interpretation += "Harlequin";
                  }else{
                      interpretation += " with harlequin";
                  }
              }else{
                  if (interpretation === '') {
                      interpretation += "Harlequin carrier";
                  }else{
                      interpretation += " harlequin carrier";
                  }
              }
          }
      }
  }
  // S locus
  if (combination.includes("P") || combination.includes("p")) {
      if (combination.includes("PP")) {
          if (interpretation === '') {
              interpretation += "No white spotting, flash, parti, or piebald";
          }else{
              interpretation += " with no white spotting, flash, parti, or piebald";
          }
      }else if (combination.includes("Pp")) {
          if (interpretation === '') {
              interpretation += "Limited white spotting, flash, parti, or piebald";
          }else{
              interpretation += " with limited white spotting, flash, parti, or piebald";
          }
      }else{
          if (interpretation === '') {
              interpretation += "Nearly solid white, parti, or piebald";
          }else{
              interpretation += " with nearly solid white, parti, or piebald";
          }
      }
  }
  // Co locus
  if (combination.includes("C") || combination.includes("c")) {
      if (combination.includes("cc")) {
          if (interpretation === '') {
              interpretation = "Cocoa";
          }else if (interpretation.includes("Black")) {
              interpretation = interpretation.replace("Black", "Cocoa");
          }else if (interpretation.includes("Brown")) {
              interpretation = interpretation.replace("Brown", "Cocoa");
          }else {
              interpretation += " with Cocoa";
          }
      }else if (combination.includes("Cc")) {
          if (interpretation === '') {
              interpretation += "Carrier of Cocoa";
          }else{
              interpretation += " with carrier of Cocoa";
          }
      }else{
          if (interpretation === '') {
              interpretation += "Not a carrier of Cocoa";
          }else{
              interpretation += " not a carrier of Cocoa";
          }
      }
  }
  // M locus
  if (combination.includes("R") || combination.includes("r")) {
      if (combination.includes("RR")) {
          interpretation = "Double merle, high chance of deafness/blindness";
      } else if (combination.includes("Rr")) {
          if (interpretation === '') {
              interpretation += "Merle, phenotype depending on insertion size";
          }else{
              interpretation += " with Merle, phenotype dependent on insertion size";
          }
      } else {
          if (interpretation === '') {
              interpretation += "No merle";
          }else{
              interpretation += " with no Merle";
          }
      }
  }
  // E^g locus
  if (combination.includes("G") || combination.includes("g")) {
      if (combination.includes("gg")) {
          if (interpretation === '') {
              interpretation += "Not a carrier for Grizzle";
          }else{
              interpretation += " not a carrier for Grizzle";
          }
      } else if (!interpretation.includes("Grizzle")) {
          // Add text for Grizzle if not already in
          if (interpretation === '') {
              interpretation += "Grizzle carrier";
          }else{
              interpretation += " Grizzle carrier";
          }
      }
  }
  // E^m locus
  if (combination.includes("M") || combination.includes("m")) {
      if (combination.includes("M")) {
          if (interpretation === '') {
              interpretation += "Melanistic mask (possibly non-visible)";
          }else{
              interpretation += " with Melanistic mask (possibly non-visible)";
          }
          // Add the carrier text if E^m/N
          if (combination.includes("Mm")) {
              interpretation += " (carrier)";
          }
          if (combination.includes("E") && combination.includes("kk") && combination.includes("Y")) {
              // mask only shows up if not "e/e", and is "ky/ky" and "Ay/*"
              interpretation = interpretation.replace(" (possibly non-visible)", "");
          }
      }else{
          if (interpretation === '') {
              interpretation += "No melanistic mask";
          }else{
              interpretation += " with no Melanistic mask";
          }
      }
  }
  // I locus
  if (combination.includes("I") || combination.includes("i")) {
      if (combination.includes("ii") && !interpretation.includes("Cream")) {
          if (interpretation === '') {
              interpretation += "Reduced intensity";
          }else{
              interpretation += " with reduced intensity";
          }
      } else if (combination.includes("I")) {
          if (interpretation === '') {
              interpretation += "No reduced intensity";
          }else{
              interpretation += " with no reduced intensity";
          }
      }
  }

  // Add the nose and footpad info if B locus is known
  if (combination.includes("B") || combination.includes("b")) {
      if (combination.includes("B")) {
          if (interpretation === '') {
              interpretation = "Black nose and footpads";
          }else{
              interpretation += " with black nose and footpads";
          }
      }else{
          if (interpretation === '') {
              interpretation = "Brown nose and footpads";
          }else{
              interpretation += " with brown nose and footpads";
          }
      }
  }

  // Cu locus
  if (combination.includes("U") || combination.includes("u")) {
      if(combination.includes("UU")) {
          if (interpretation === '') {
              interpretation += "Curly coat";
          }else{
              interpretation += " with Curly coat";
          }
      }else if (combination.includes("Uu")) {
          if (interpretation === '') {
              interpretation += "Curly/Wavy coat (carrier)";
          }else{
              interpretation += " with Curly/Wavy coat (carrier)"
          }
      } else {
          if (interpretation === '') {
              interpretation += "Straight coat";
          }else{
              interpretation += " with Straight coat"
          }
      }
  }

  // IC locus
  if (combination.includes("F") || combination.includes("f") || combination.includes("q")) {
      if(combination.includes("FF")) {
          if (interpretation === '') {
              interpretation += "Furnishings";
          }else{
              interpretation += " with Furnishings";
          }
      }else if (combination.includes("Ff")) {
          if (interpretation === '') {
              interpretation += "Furnishings (weak carrier)";
          }else{
              interpretation += " with Furnishings (weak carrier)";
          }
      }else if (combination.includes("Fq")) {
          if (interpretation === '') {
              interpretation += "Furnishings (improper coat carrier)";
          }else{
              interpretation += " with Furnishings (improper coat carrier)";
          }
      }else if (combination.includes("ff")) {
          if (interpretation === '') {
              interpretation += "Weak Furnishings";
          }else{
              interpretation += " with Weak Furnishings";
          }
      }else if (combination.includes("fq")) {
          if (interpretation === '') {
              interpretation += "Weak Furnishings (improper coat carrier)";
          }else{
              interpretation += " with Weak Furnishings (improper coat carrier)";
          }
      }else{
          if (interpretation === '') {
              interpretation += "No Furnishings, improper coat";
          }else{
              interpretation += " with no Furnishings, improper coat";
          }
      }
  }

  // Lh^1 and Lh^4 loci can have compound heterozygosity, so do them together
  if (combination.includes("L") || combination.includes("l") || combination.includes("O") | combination.includes("o")) {
      // Do single versions first
      if ((combination.includes("L") || combination.includes("l")) && !(combination.includes("O") || combination.includes("o"))) {
          if (combination.includes("LL")) {
              interpretation = "Shorthaired " + interpretation;
          }else if (combination.includes("Ll")) {
              interpretation = "Shorthaired (carries long hair) " + interpretation;
          }else{
              interpretation = "Longhaired " + interpretation;
          }
      }else if ((combination.includes("O") || combination.includes("o")) && !(combination.includes("L") || combination.includes("l"))) {
          if (combination.includes("OO")) {
              interpretation = "Shorthaired " + interpretation;
          }else if (combination.includes("Oo")) {
              interpretation = "Shorthaired (carries long hair) " + interpretation;
          }else{
              interpretation = "Longhaired " + interpretation;
          }
      }else{
          // combined cases
          if ((combination.includes("ll") || combination.includes("oo")) || (combination.includes("l") && combination.includes("o"))) {
              interpretation = "Longhaired " + interpretation;
          }else if (combination.includes("l") || combination.includes("o")) {
              interpretation = "Shorthaired (carries long hair) " + interpretation;
          }else{
              interpretation = "Shorthaired " + interpretation;
          }
      }
  }

  // SD locus
  if (combination.includes("J") || combination.includes("j")) {
      if(combination.includes("JJ")) {
          if (interpretation === '') {
              interpretation += "High shedding";
          }else{
              interpretation += " with High shedding";
          }
      }else if (combination.includes("Jj")) {
          if (interpretation === '') {
              interpretation += "Moderate shedding";
          }else{
              interpretation += " with Moderate shedding";
          }
      }else{
          if (interpretation === '') {
              interpretation += "Low shedding";
          }else{
              interpretation += " with Low shedding";
          }
      }
  }

  // There shouldn't be any cases left with no translations, but just in case:
  if (interpretation === '') {
      interpretation = "No translation found!";
  }

  return interpretation;
}

// function to unselect all dogs (by gender), to be used to clear form and before a dog is selected
function UnselectDog(gender) {
    document.querySelectorAll('.' + gender).forEach(function (element) {
      if (gender === 'user-dam') {
          element.value = "Select Dam";
          document.querySelectorAll("[id^=" + element.id + "]").forEach(function (element) {
            element.checked = false;
          });
      }else{
          element.value = "Select Sire";
          document.querySelectorAll("[id^=" + element.id + "]").forEach(function (element) {
            element.checked = false;
          });
      }
      element.style.backgroundColor = "#1d5eae"
    });
    clearResults();
    showCards();
}

// function to deal with when a dog is selected from the users account
function UserDogSelect(SelectID, gender, selectAll) {
    // Checking all boxes for selected dog, if "Select Sire/Dam was chosen
    if(selectAll) {
        // Check to see if we are clicking on an already selected dog and just clear if we are
        if (SelectID.value === "Unselect") {
            UnselectDog(gender);
            return;
        }
        document.querySelectorAll("[id^=" + SelectID.id + 'ID' + "]").forEach(function (element) {
            let myRegEx = new RegExp(SelectID.id + 'ID' + '\\w{1,2}' + 'Locus');
            if (element.id.match(myRegEx)) {
                element.checked = true;
            }
        });
    }

    // Prevent the user from having 2 dogs of the same gender selected
    if (gender === 'user-dam') {
        document.querySelectorAll(".user-dam").forEach(function (element){
            if (element.value === "Unselect" && element.id !== SelectID.id) {
                clearCard(element, gender);
            }
        });
    }
    if (gender === 'user-sire') {
        document.querySelectorAll(".user-sire").forEach(function (element){
            if (element.value === "Unselect" && element.id !== SelectID.id) {
                clearCard(element, gender);
            }
        });
    }

  // Now select the current choice
  SelectID.value = "Unselect";
  SelectID.style.backgroundColor = "#dc5250"




    // If both dam and sire are selected, remove all other dogs until cleared or unselected
    if (gender === 'user-sire') {
        document.querySelectorAll(".user-dam").forEach(function (element) {
           if (element.value === "Unselect") {
               // Means one of each is selected, so call the function to hide the others
               hideCards(SelectID, element);
           }
        });
    }
    if (gender === 'user-dam') {
        document.querySelectorAll(".user-sire").forEach(function (element) {
           if (element.value === "Unselect") {
               // Means one of each is selected, so call the function to hide the others
               hideCards(SelectID, element);
           }
        });
    }

}
// function to change display status of class elements if the associated checkbox is checked
function ShowHideClass(chkboxid, classid) {
  const chkbox = document.getElementById(chkboxid);
  document.querySelectorAll('.' + classid).forEach(function (element) {
      //element.style.display = chkbox.checked ? "block" : "none";
      if (chkbox.checked) {
          element.removeAttribute("disabled");
      }else{
          element.setAttribute("disabled", "disabled");
      }
  });
}
// function for change which form is displayed
function ShowHideForm() {
    const chkbox = document.getElementById('userChoice');
    if (chkbox.checked) {
        document.getElementById('coatForm').style.display = "none";
        document.getElementById('userChoiceForm').style.display = "block";
    }else{
        document.getElementById('coatForm').style.display = "block";
        document.getElementById('userChoiceForm').style.display = "none";
    }
}
//Similar function to show/hide the rows that are breed dependant
function ShowHideRow(breedID) {
  let breeds = ['bulldogRow', 'afghanRow', 'greatdaneRow', 'Other'];
  let others = breeds.filter(breed => breed != breedID);
  // if Breed is marked back to 'Other' reset the display back to invisible
  if (breedID != 'Other') {
      document.getElementById(breedID).style.display = "table-row";
  }
  // Unhide the Lh^4 locus if bulldog or afghan hound
  if (breedID === 'bulldogRow' || breedID === 'afghanRow') {
      document.getElementById('lh4rowClass').style.display = "table-row";
  }else{
      document.getElementById('lh4rowClass').style.display = "none";
      document.getElementById('lh4locus').checked = false;
  }
  for (const other of others) {
      if (other === 'Other') { continue; }
      document.getElementById(other).style.display = "none";
      // The others also now need to be unchecked so they aren't included
      if (other === 'bulldogRow') {
          document.getElementById('colocus').checked = false;
      }
      if (other === 'greatdaneRow') {
          document.getElementById('hlocus').checked = false;
      }
      if (other === 'afghanRow') {
          document.getElementById('eglocus').checked = false;
      }

  }
}

function bLocusChoice(Bvalue, locusID) {
    // function to change the value of the B Locus if it was undetermined by test
    document.getElementById(locusID).value = Bvalue;
    document.getElementById(locusID).setAttribute('data-genotype', Bvalue);
    const locusIDlbl = locusID + 'lbl';
    const BvalueSplit = [Bvalue.slice(0,1), '/', Bvalue.slice(1)].join('');
    document.getElementById(locusIDlbl).innerText = "Undetermined B Locus (Brown). Choose nose color - " + BvalueSplit;
}

function agoutiChoice() {
  // Put up text to indicate that K is required if choosing A
  if(document.getElementById("agoutilocus").checked && !document.getElementById("klocus").checked) {
      // Add the text to the box
      document.getElementById("agoutiLabel").innerHTML = "Agouti (A locus) - requires K locus";
  } else if (document.getElementById("agoutilocus").checked && document.getElementById("klocus").checked) {
      document.getElementById("agoutiLabel").innerHTML = "Agouti (A locus)";
  }
}

// Define the variable to store the chart instance, must be outside function
let myChart;
function createChart(resultsArray, total, type) {
    let coat_chart = document.getElementById("coatChart");
    let Data = {};
    let labels = [];
    let results = [];
    let titleText = "";
    let largest_percent = 0;
    const maxResultsWidth = 30;
    // Try putting them in a sortable array to display the results largest first
    let sortable = [];
    for (let result in resultsArray) {
        sortable.push([result, resultsArray[result]]);
    }
    sortable.sort(function(a,b) {
        // Want largest to smallest
        return b[1] - a[1];
    });
    sortable.forEach(putInChartFormat);
    function putInChartFormat(result) {
        let percent = (Math.round((100 * (result[1]/total)*100))/100).toFixed(2);
        let Label = percent + "% - " + result[0];
        labels.push(Label);
        results.push(percent);
    }
    // Detect if on mobile to use different options
    const device = detectDevice();
    // Set the title depending on whether we are a coat/trait test or disease
    if (type === 'coat') {
        titleText = "Expected appearance";
    }else {
        titleText = "Expected inheritance";
    }

    largest_percent = Math.max.apply(Math, results);
    // variable to store the largest number of lines of text after formatting
    let largest_line_number = 0;
    // function to format the labels to approximate word wrap
    function formatLabel(str, maxwidth) {
        let sections = [];
        // if on mobile, remove the percentage from the end
        if (device === 'mobile') {
            str = str.replace(/\s-\s[\w\W]+$/, '');
        }
        let words = str.split(" ");
        let temp = "";
        words.forEach(function(item, index) {
            if (temp.length > 0) {
                const concat = temp + ' ' + item;
                if (concat.length > maxwidth) {
                    sections.push(temp);
                    temp = "";
                } else {
                    if (index == (words.length-1)) {
                        sections.push(concat);
                        return;
                    } else {
                        temp = concat;
                        return;
                    }
                }
            }
            if (index == (words.length-1)) {
                sections.push(item);
                return;
            }
            if (item.length < maxwidth) {
                temp = item;
            } else {
                sections.push(item);
            }
        });
        if (sections.length > largest_line_number) {
            largest_line_number = sections.length;
        }
        return sections;
    }

    // Get the colors
    const colorScale = d3.interpolateRainbow;
    const colorRangeInfo = {
        colorStart: 0,
        colorEnd: 1,
        useEndAsStart: true,
    };
    const COLORS = interpolateColors(labels.length, colorScale, colorRangeInfo);

    Data = {
        datasets: [{
            backgroundColor: COLORS,
            hoverBackgroundColor: COLORS,
            data: results,
            maxBarThickness: 80,
        }],
        labels: labels
    };

    // if the chart has already been drawn, need to clear it by destroying the old one
    if (myChart) {
        myChart.destroy();
    }

    // Set the options and stuff depending on mobile/desktop
    const chartDiv = document.getElementById('coatChartDiv');
    let barType;
    let deviceOptions;
    if (device === 'mobile'){
        barType = 'bar';
        deviceOptions = {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: true,
                text: [titleText, "Click on bar for interpretation"],
            },
            legend: {
                display: false,
                align: 'left',
                position: 'right',
                labels: {
                    fontSize: 14,
                }
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        max: Math.min(Math.round((largest_percent * 1.3) / 5) * 5, 100),
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Probability'
                    },
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: false,
                        userCallback: function(value, index, values) {
                            // replace everything in x-axis label except percentage
                            return value.replace(/^[\w\W]+\s-\s/, '');
                        }
                    }
                }]
            },
            tooltips: {
                callbacks: {
                    title: function(tooltipItem, data) {
                        const tooltip = tooltipItem[0].xLabel;
                        const formattedTooltip = formatLabel(tooltip,maxResultsWidth);
                        return formattedTooltip;
                    },
                    label: function(tooltipItem, data) {
                        return tooltipItem.xLabel.replace(/^[\w\W]+\s-\s/, '');
                    }
                }
            }
        };
        // Set the minimum height for the canvas
        chartDiv.style.minHeight = '500px';
    }else{
        barType = 'horizontalBar';
        deviceOptions = {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: true,
                fontSize: 18,
                text: titleText,
            },
            legend: {
                display: false,
                align: 'left',
                position: 'right',
                labels: {
                    fontSize: 14,
                }
            },
            scales: {
                xAxes: [{
                    ticks: {
                        fontSize: 18,
                        beginAtZero: true,
                        max: Math.min(Math.round((largest_percent * 1.3) / 5) * 5, 100),
                        callback: function(value, index, values) {
                            return value + '%';
                        }
                    }
                }],
                yAxes: [{
                    ticks: {
                        autoSkip: false,
                        userCallback: function(value, index, values) {
                            // format label so that it approximates word wrap
                            const formattedLabel = formatLabel(value, maxResultsWidth);
                            return formattedLabel;
                        }
                    }
                }]
            },
            tooltips: {
                callbacks: {
                    title: function(tooltipItem, data) {
                        let tooltip = tooltipItem[0].yLabel;
                        tooltip = tooltip.replace(/\s-\s[\w\W]+$/, '')
                        const formattedTooltip = formatLabel(tooltip,maxResultsWidth);
                        return formattedTooltip;
                    },
                    label: function(tooltipItem, data) {
                        return tooltipItem.yLabel.replace(/^[\w\W]+\s-\s/, '');
                    }
                }
            }
        };
        // Resize the chart based on the number of results (desktop only) and number of lines in interpretation
        // need to call the formatlabel function to get the largest number of lines
        labels.forEach(label => formatLabel(label, 30));
        let tempSize = results.length * largest_line_number * 20;
        // Set minimum and max height
        if (tempSize > 32767) {
            tempSize = 32767;
        }else if (tempSize < 500) {
            tempSize = 500;
        }
        const newSize = String(tempSize) + 'px';
        chartDiv.style.height = newSize;
    }
    Chart.defaults.global.defaultFontSize = 14;
    myChart = new Chart(coat_chart, {
        type: barType,
        data: Data,
        options: deviceOptions,

    })
}

function calculatePoint(i, intervalSize, colorRangeInfo) {
  const {colorStart, colorEnd, useEndAsStart } = colorRangeInfo;
  return (useEndAsStart ? (colorEnd- (i * intervalSize)) : (colorStart + (i * intervalSize)));
}
function interpolateColors(dataLength, colorScale, colorRangeInfo) {
    const {colorStart, colorEnd} = colorRangeInfo;
    const colorRange = colorEnd - colorStart;
    const intervalSize = colorRange / dataLength;
    let i, colorPoint;
    let colorArray = [];

    for (i = 0; i < dataLength; i++) {
        colorPoint = calculatePoint(i, intervalSize, colorRangeInfo);
        colorArray.push(colorScale(colorPoint));
    }

    return colorArray;
}

// Function to detect if on portrait mode on mobile
function detectDevice() {
    //return !!navigator.maxTouchPoints ? 'mobile' : 'computer';
    // below version will use the same as desktop if the device is in landscape mode
    return !navigator.maxTouchPoints ? 'desktop' : !window.screen.orientation.angle ? 'mobile' : 'landscape';
}

// Functions for disease calculator, if they are different than the ones used above for the coat/trait calculator
function diseaseProcessForm() {
    // clear the results table if it already has stuff in it
    document.getElementById('results').value = '';
    getDiseasePunnett().done(handleDiseasePunnett);
}

function getDiseasePunnett() {
    // function to do the AJAX request
  let damGenotypes = '';
  let sireGenotypes = '';
  const Genotypes = getDiseaseGenotypes();
  damGenotypes = Genotypes.damGenotypes;
  sireGenotypes = Genotypes.sireGenotypes;
  const numTests = Genotypes.numTests;
  const testInheritances = Genotypes.testInheritances;
  // only need to get one copy of the tests since they are identical at this point
  const tests = Genotypes.damTests;

  if (numTests > 8) {
      alert("Too many tests selected, please remove some to submit. The limit is 8 tests.");
      return;
  }

    // Check to make sure one dam and one sire are selected
    let numDams = 0;
    document.querySelectorAll(".user-dam").forEach(function (element) {
       if (element.value === "Unselect") {
           // Means this one is selected, so add to count
           numDams++;
       }
    });
    if (numDams == 0) {
        alert("One dam must be selected!");
        return;
    }
    let numSires = 0;
    document.querySelectorAll(".user-sire").forEach(function (element) {
       if (element.value === "Unselect") {
           // Means this one is selected, so add to count
           numSires++;
       }
    });
    if (numSires == 0) {
        alert("One sire must be selected!");
        return;
    }

      // send the form data to the API
    let form = new FormData();
    form.append("dam_genotypes", damGenotypes);
    form.append("sire_genotypes", sireGenotypes);
    return $.ajax({
      "url": "/api/v1/calculator/",
      "method": "POST",
      "timeout": 0,
      "processData": false,
      "mimeType": "multipart/form-data",
      "contentType": false,
      "data": form,
      dataType: "json",
      success: function (data) {
          // Add the test data so that it can be used in handleDiseasePunnett
          data["Tests"] = tests;
          data["Inheritances"] = testInheritances;
      }
    });
}

function handleDiseasePunnett(data) {
    // function to go back and process the Punnett data
  let resultsTable = document.getElementById("results-table");
  // Clear out any previous results
  $('#results').empty();
  resultsTable.style.visibility = 'visible';
  const combinations = data["combinations"];
  let tests = data["Tests"];
  const inheritances = data["Inheritances"];
  let total = 0;
  // Store if there was an X-linked test
  let xLinked = false;
  // Need to loop through once to get the total number to output percentages and look for X-linked tests
  for (const key in combinations) {
      total += combinations[key];
      // Check if any of the genotypes returned an X-linked result and set xLinked true if it did
      if (key.includes('Z')) {
          xLinked = true;
      }
  }
  // Object to store the results to properly count them
  let resultsArray = {};
  for (const key in combinations) {
      let DermaGenotypes = '';
      let DermaBoolean = false;
      let spaced = '';
      // Need to pull out the Dermatomyositis genotypes and translate them separately
      if (tests[tests.length -1] == 'Dermatomyositis') {
          DermaGenotypes = key.slice(-6);
          DermaBoolean = true;
      }
      // regex to pretty up the text
      if (DermaBoolean) {
          // DermaGenotypes should be done separately, so remove them from the end of the key
          spaced = key.slice(0,-6).replace(/(.{2})/g,"$1 ");
      }else{
          spaced = key.replace(/(.{2})/g,"$1 ");
      }
      spaced = spaced.replace(/(\w)(\w)/g,"$1/$2");
      let translated = diseaseTransliterate(spaced);
      const percent = (Math.round(((combinations[key] / total) * 100 * 100))/100).toFixed(2);
      let interpretation = '';
      if (tests[0] !== 'Dermatomyositis') { // Dermamyositis is not the only test
          interpretation = translateDiseaseCombination(translated, tests, inheritances);
      }
      if (DermaBoolean) {
          interpretation = translateDermaCombination(DermaGenotypes, interpretation);
          translated += " " + DermaGenotypes;
      }
      // If X-linked results, add the sex to the interpretation
      if (xLinked) {
          if (translated.includes('Y')) {
              interpretation = interpretation.charAt(0).toLowerCase() + interpretation.slice(1);
              interpretation = "Male, " + interpretation;
          }else{
              interpretation = interpretation.charAt(0).toLowerCase() + interpretation.slice(1);
              interpretation = "Female, " + interpretation;
          }
      }
      // Translate the results to more client readable form
      let clientTranslated = clientTranslate(spaced, tests);
      if (DermaBoolean) {
          clientTranslated += " " + DermaGenotypes;
      }
      let htmlInterpretation;
      if(interpretation.includes('ffected') || interpretation.includes('High risk')) {
          // Highlight affected and high risk results in the results table
          htmlInterpretation = '<p style="background-color: #FF7F7F; margin-bottom: 0; margin-top: 0">' + percent + "% - " + clientTranslated + " - " +  interpretation + "</p>";
      } else {
          htmlInterpretation = '<p style="margin-bottom: 0; margin-top: 0">' + percent + "% - " + clientTranslated + " - " + interpretation + '</p>';
      }
      $('#results').html($('#results').html() + htmlInterpretation);

      if (resultsArray[interpretation]) {
          resultsArray[interpretation] += combinations[key];
      } else {
          resultsArray[interpretation] = combinations[key]
      }
  }
  // Add the test order
  const testOrder = document.getElementById('testOrder');
  let testString = "Order of tests in results table:";
  for (let i=0; i < tests.length; i++) {
      testString += "<br>&emsp;" + tests[i];
  }
  testOrder.innerHTML = testString;

  // Finally, draw the chart
  createChart(resultsArray, total, "disease");
}

// Translate the genotypes to a more client readable form, just for the results-table
function clientTranslate(word, tests) {
    let translated = '';
    let testNumber = 0;
    for (let i =0; i < word.length; i++) {
        if (word.charAt(i) === '/' || word.charAt(i) === ' '){
            translated += word.charAt(i);
            if (word.charAt(i) === ' '){
                testNumber++;
            }
        } else if (word.charAt(i) === 'Z') {
            translated += 'Y';
        } else if (word.charAt(i) === word.charAt(i).toUpperCase()) {
            if (tests[testNumber] === 'Chondrodysplasia (CDPA)'){
                translated += 'CD';
            }else {
                translated += 'M';
            }
        } else if (word.charAt(i) === word.charAt(i).toLowerCase()) {
            if (tests[testNumber] === 'Chondrodysplasia (CDPA)'){
                translated += 'cd';
            }else{
                translated += 'WT';
            }
        }
    }
    return translated;
}

// Translate to the form needed for interpretation
function diseaseTransliterate(word) {
    let translated = '';
    for (let i =0; i < word.length; i++) {
        if (word.charAt(i) === '/' || word.charAt(i) === ' '){
            translated += word.charAt(i);
        } else if (word.charAt(i) === 'Z') {
            translated += 'Y';
        } else if (word.charAt(i) === word.charAt(i).toUpperCase()) {
            translated += 'M';
        } else if (word.charAt(i) === word.charAt(i).toLowerCase()) {
            translated += 'WT';
        }
    }
    return translated;
}

function translateDermaCombination(DermaGenotypes, interpretation) {
    DermaTranslation = '';
    // Check which case the Dermatomyositis genotype matches, table on https://www.pawprintgenetics.com/products/tests/details/235/
    if (DermaGenotypes.match(/(aabbcc|Aabbcc|AaBbcc|AAbbcc|aaBBcc|AaBBcc|AABbcc|AABBcc)/)) {
        DermaTranslation = 'Unknown risk for Dermatomyositis';
    }else if (DermaGenotypes.match(/(aabbCc|aabbCC|AabbCc|AabbCC|aaBbcc|aaBbCc|aaBbCC|AaBbCc|AaBbCC|aaBBCc)/)) {
        DermaTranslation = 'Low risk for Dermatomyositis';
    }else if (DermaGenotypes.match(/(AAbbCc|AAbbCC|aaBBCC|AaBBCc|AABbCc)/)) {
        DermaTranslation = 'Moderate risk for Dermatomyositis';
    }else if (DermaGenotypes.match(/(AaBBCC|AABbCC|AABBCc|AABBCC)/)) {
        DermaTranslation = 'High risk for Dermatomyositis';
    }else{
        DermaTranslation = 'No translation found for Dermatomyositis';
    }
    if (interpretation == '' || interpretation == 'Clear for all selected tests') {
        return DermaTranslation;
    }else{
        return interpretation + ", " + DermaTranslation;
    }
}

function translateDiseaseCombination(combination, tests, inheritances) {
    let interpretation = '';
    combination = combination.trim();
    let translated = combination.split(' ');

    for (let i = 0; i < translated.length; i++) {
        // Special case for copper toxicosis atp7a and atp7b
        if (tests[i].includes('ATP7A')) {
            if (translated[i].includes('M/M')) {
                if (interpretation === '') {
                    interpretation = "Two copy carrier for " + tests[i];
                } else{
                    interpretation += ", two copy carrier for " + tests[i];
                }
            } else if (translated[i].includes('M')) {
                if (interpretation === '') {
                    interpretation = "Carrier for " + tests[i];
                } else {
                    interpretation += ", carrier for " + tests[i];
                }
            }
        } else if (tests[i].includes('ATP7B')) {
            if (translated[i].includes("M")) {
                if (interpretation === '') {
                    interpretation = "At risk/affected for " + tests[i];
                } else {
                    interpretation += ", at risk/affected for " + tests[i];
                }
            }
        // Special case for Hereditary cataracts (Australian Shepherd type), Polyneuropathy (Leonberger Type 2), and Cystinuria (Australian Cattle Dog type), similar to Autosomal incomplete dominant
        } else if ((tests[i] ==="Hereditary Cataracts (Australian Shepherd Type)") || tests[i] ==="Polyneuropathy (Leonberger Type 2)" || tests[i] ==="Cystinuria (Australian Cattle Dog Type)") {
            if (translated[i].includes("M") && !translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "Carrier (at risk) for " + tests[i];
                } else {
                    interpretation += ", carrier (at risk) for " + tests[i];
                }
            } else if (translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "At risk/affected by " + tests[i];
                } else {
                    interpretation += ", at risk/affected by " + tests[i];
                }
            }
        // Special case for Dilated Cardiomyopathy and Gallbladder Mucoceles
        } else if ((tests[i] === "Dilated Cardiomyopathy" || tests[i] === "Gallbladder Mucoceles")) {
            if (translated[i].includes("M") && !translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "At risk for " + tests[i];
                } else {
                    interpretation += ", at risk for " + tests[i];
                }
            } else if (translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "At risk/affected by " + tests[i];
                } else {
                    interpretation += ", at risk/affected by " + tests[i];
                }
            }
        // Special case for Chondrodysplasia
        } else if (tests[i] === "Chondrodysplasia (CDPA)") {
            if (translated[i].includes("M")) {
                if (interpretation === '') {
                    interpretation = "Shortened legs associated with CDPA";
                } else {
                    interpretation += ", shortened legs associated with CDPA";
                }
            }
        // Special case for CDDY/IVDD
        } else if (tests[i] === "Chondrodystrophy with Intervertebral Disc Disease Risk Factor (CDDY with IVDD)") {
            if (translated[i].includes("M")) {
                if (interpretation === '') {
                    interpretation = "Shortened legs and increased IVDD risk associated with CDDY";
                } else {
                    interpretation += ", shortened legs and increased IVDD risk associated with CDDY";
                }
            }
        } else if (inheritances[tests[i]].includes("Autosomal Incomplete Dominant")) { // Autosomal incomplete cases
            if (translated[i].includes("M") && !translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "Carrier (at risk) for " + tests[i];
                } else {
                    interpretation += ", carrier (at risk) for " + tests[i];
                }
            } else if (translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "At risk/affected by " + tests[i];
                } else {
                    interpretation += ", at risk/affected by " + tests[i];
                }
            }
        } else if (inheritances[tests[i]].includes("Autosomal Dominant")) { // Autosomal dominant cases
            if (translated[i].includes("M")) {
                if (interpretation === '') {
                    interpretation = "At risk/affected by " + tests[i];
                } else {
                    interpretation += ", at risk/affected by " + tests[i];
                }
            }
        } else { // All other cases
            if (translated[i].includes("M") && !translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "Carrier for " + tests[i];
                } else {
                    interpretation += ", carrier for " + tests[i];
                }
            } else if (translated[i].includes("M/M")) {
                if (interpretation === '') {
                    interpretation = "At risk/affected by " + tests[i];
                } else {
                    interpretation += ", at risk/affected by " + tests[i];
                }
            }
        }
    }
    if (interpretation === '') {
        interpretation = "Clear for all selected tests";
    }
    return interpretation;
}

function getDiseaseGenotypes() {
  let damGenotypes = '';
  let sireGenotypes = '';
  // Counters to be able to translate the genotypes to a form that can be submitted to punnett API
  let damCount = 0;
  let sireCount = 0;
  // string to store which tests are checked
  let damTests = [];
  let sireTests = [];
  // Store the object with the different test inheritance types
  let testInheritances = {};
  // Store the number of X-Linked tests
  let xLinkedNumber = 0;
  document.querySelectorAll('input[class=userDamCheckbox]:checked').forEach(function (element) {
      let genotype = element.value;
      const test = element.dataset.testresult;
      damTests.push(test);
      inheritance = element.dataset.inheritance;
      if(!testInheritances.hasOwnProperty(test)) {
          testInheritances[test] = inheritance;
          if (inheritance === "X-Linked Recessive") {
              xLinkedNumber++;
          }
      }
      const genos = genotype.split('/');
      let geno1 = genos[0];
      let geno2 = genos[1];
      let tempGenotype = '';
      if (geno1 === 'WT' || geno1 === 'cd') {
          geno1 = String.fromCharCode(97 + damCount);
      }else{
          geno1 = String.fromCharCode(65 + damCount);
      }
      if (geno2 === 'WT' || geno2 === 'cd') {
          geno2 = String.fromCharCode(97 + damCount);
      }else{
          geno2 = String.fromCharCode(65 + damCount);
      }
      if (geno1 == geno1.toUpperCase()) {
          tempGenotype = geno1 + geno2;
      }else if (geno2 == geno2.toUpperCase()) {
          tempGenotype = geno2 + geno1;
      }else{
          tempGenotype = geno1 + geno2;
      }
      damGenotypes += tempGenotype;
      damCount += 1;
  });
  document.querySelectorAll('input[class=userSireCheckbox]:checked').forEach(function (element) {
      let genotype = element.value;
      const test = element.dataset.testresult;
      sireTests.push(test);
      inheritance = element.dataset.inheritance;
      if(!testInheritances.hasOwnProperty(test)) {
          testInheritances[test] = inheritance;
          if (inheritance === "X-Linked Recessive") {
              xLinkedNumber++;
          }
      }
      const genos = genotype.split('/');
      let geno1 = genos[0];
      let geno2 = genos[1];
      if (geno2 === 'Y') {
          // X-linked case, but Y is already used by Agouti in Punnett calculator
          geno2 = 'Z';
      }
      let tempGenotype = '';
      if (geno1 === 'WT' || geno1 === 'cd') {
          geno1 = String.fromCharCode(97 + sireCount);
      }else{
          geno1 = String.fromCharCode(65 + sireCount);
      }
      if (geno2 === 'WT' || geno2 === 'cd') {
          geno2 = String.fromCharCode(97 + sireCount);
      }else if (geno2 !== 'Z') {
          geno2 = String.fromCharCode(65 + sireCount);
      }
      if (geno1 == geno1.toUpperCase()) {
          tempGenotype = geno1 + geno2;
      }else if (geno2 == geno2.toUpperCase()) {
          tempGenotype = geno2 + geno1;
      }else{
          tempGenotype = geno1 + geno2;
      }
      sireGenotypes += tempGenotype;
      sireCount += 1;
  });
  // Special case for Dermatomyositis, save the genotypes and add them after the reordering of genotypes that starts with the line
    // "let tempDamGenotypes = ''"
  let damDermaGenotypes = '';
  let sireDermaGenotypes = '';
  document.querySelectorAll('input[class=userDamDermaCheckbox]:checked').forEach(function (element) {
      let genotype = element.value;
      const test = element.dataset.testresult;
      damTests.push(test);
      damDermaGenotypes = genotype;
  });
  document.querySelectorAll('input[class=userSireDermaCheckbox]:checked').forEach(function (element) {
      let genotype = element.value;
      const test = element.dataset.testresult;
      sireTests.push(test);
      sireDermaGenotypes = genotype;
  });

  // Check if more than 1 X-Linked test is submitted, and alert user this doesn't work and stop
  if (xLinkedNumber > 1) {
      alert("This calculator will only work with one X-Linked test at a time (X-Linked test results will end with '/Y' for the sire)");
      return;
  }
  //Check if the dam and sire have the same tests included
  // and if they don't remove the difference with a symmetric difference
    // Do the symmetric difference
    const x = damTests.filter(x => !sireTests.includes(x));
    const y = sireTests.filter(x => !damTests.includes(x));
    let mismatchedTests = x.concat(y);
    // If Dermatomyositis is in the mismatched list, make sure it is removed and show a popup
    if (mismatchedTests.includes("Dermatomyositis")) {
        const index = mismatchedTests.indexOf('Dermatomyositis');
        mismatchedTests.splice(index, 1);
        alert("Dermatomyositis must be on both dam and sire");
    }

    // If one of the mismatched tests is X-Linked, show a popup, don't continue
    for (let i=0; i<mismatchedTests.length; i++) {
        if (testInheritances[mismatchedTests[i]] === "X-Linked Recessive") {
            alert("Test " + mismatchedTests[i] + " is X-Linked and requires matching tests on the dam and sire");
            return;
        }
    }

    // If there are mismatched tests, add an alert warning the client
    if (mismatchedTests.length > 0) {
        alert('You have selected tests that are not available for both dogs, the missing tests will be assumed normal/clear in these calculations');
    }

    let mismatchedGenotypes = '';
    // Loop through and remove any mismatched tests from the dam and sire tests
    for (let i =0; i<mismatchedTests.length; i++) {
        const damIndex = damTests.indexOf(mismatchedTests[i]);
        if (damIndex > -1) {
            damTests.splice(damIndex, 1);
            let genotypesArray = damGenotypes.split('');
            // Get the current mismatched genotypes and translitereate them so they begin again at
            //  A/a and add new ones as B/b, etc.
            let tempMismatchedGenotypes = genotypesArray.splice(2*damIndex, 2);
            let sizeOfMismatched = mismatchedGenotypes.length / 2;
            // Special case if X-linked
            if (tempMismatchedGenotypes[1] === 'Z') {
                if (tempMismatchedGenotypes[0].charCodeAt(0) < 97) {
                    tempMismatchedGenotypes[0] = String.fromCharCode(65 + sizeOfMismatched);
                }else{
                    tempMismatchedGenotypes[0] = String.fromCharCode(97 + sizeOfMismatched);
                }
            }else{
                // All other cases
                for (let j=0; j<2; j++) {
                    if (tempMismatchedGenotypes[j].charCodeAt(0) < 97) {
                        tempMismatchedGenotypes[j] = String.fromCharCode(65 + sizeOfMismatched);
                    }else{
                        tempMismatchedGenotypes[j] = String.fromCharCode(97 + sizeOfMismatched);
                    }
                }
            }
            mismatchedGenotypes += tempMismatchedGenotypes.join('');
            damGenotypes = genotypesArray.join('');
        }
        const sireIndex = sireTests.indexOf(mismatchedTests[i]);
        if (sireIndex > -1) {
            sireTests.splice(sireIndex, 1);
            let genotypesArray = sireGenotypes.split('');
            // Get the current mismatched genotypes and translitereate them so they begin again at
            //  A/a and add new ones as B/b, etc.
            let tempMismatchedGenotypes = genotypesArray.splice(2*sireIndex, 2);
            let sizeOfMismatched = mismatchedGenotypes.length / 2;
            // Special case if X-linked
            if (tempMismatchedGenotypes[1] === 'Z') {
                if (tempMismatchedGenotypes[0].charCodeAt(0) < 97) {
                    tempMismatchedGenotypes[0] = String.fromCharCode(65 + sizeOfMismatched);
                }else{
                    tempMismatchedGenotypes[0] = String.fromCharCode(97 + sizeOfMismatched);
                }
            }else{
                // All other cases
                for (let j=0; j<2; j++) {
                    if (tempMismatchedGenotypes[j].charCodeAt(0) < 97) {
                        tempMismatchedGenotypes[j] = String.fromCharCode(65 + sizeOfMismatched);
                    }else{
                        tempMismatchedGenotypes[j] = String.fromCharCode(97 + sizeOfMismatched);
                    }
                }
            }
            mismatchedGenotypes += tempMismatchedGenotypes.join('');
            sireGenotypes = genotypesArray.join('');
        }
    }

    // Now that is all done, add the mismatched tests and genotypes to the dam and sire
    //  it doesn't matter if the mismatched actual ones go with the dam or sire
    //  so put them all with the sire and add clear genotypes for the dam
    let combinedTests = mismatchedTests.concat(damTests);
    // Create the clear genotypes string
    let clearGenotypes = '';
    for (let j=0; j<mismatchedTests.length; j++) {
        clearGenotypes += String.fromCharCode(97 + j) + String.fromCharCode(97 + j);
    }
    // prepend it to the damGenotypes
    damGenotypes = clearGenotypes + damGenotypes;

    // Now add the mismatchedGenotypes to the SireGenotypes
    sireGenotypes = mismatchedGenotypes + sireGenotypes

    // Make sure the genotypes are aabbcc, not aacc since we may have moved some around
    // Have to be careful, especially with X-linked and Dermatomyositis
    let tempDamGenotypes = '';
    for (let i=0; i<damGenotypes.length; i+=2) {
        let k = i/2;
        if (damGenotypes.charAt(i) !== String.fromCharCode(65 +k) || damGenotypes.charAt(i) !== String.fromCharCode(97 + k)) {
            if (damGenotypes.charCodeAt(i) < 97) {
                tempDamGenotypes += String.fromCharCode(65 + k);
            }else{
                tempDamGenotypes += String.fromCharCode(97 + k);
            }
        }else{
            tempDamGenotypes += damGenotypes.charAt(i);
        }
        if (damGenotypes.charAt(i+1) !== String.fromCharCode(65 +k) || damGenotypes.charAt(i+1) !== String.fromCharCode(97 + k) || damGenotypes.charAt(i+1) !== 'Z') {
            if (damGenotypes.charCodeAt(i+1) < 97) {
                tempDamGenotypes += String.fromCharCode(65 + k);
            }else{
                tempDamGenotypes += String.fromCharCode(97 + k);
            }
        }else{
            tempDamGenotypes += damGenotypes.charAt(i+1);
        }
    }
    damGenotypes = tempDamGenotypes;

    let tempSireGenotypes = '';
    for (let i=0; i<sireGenotypes.length; i+=2) {
        let k = i/2;
        if (sireGenotypes.charAt(i) !== String.fromCharCode(65 +k) || sireGenotypes.charAt(i) !== String.fromCharCode(97 + k)) {
            if (sireGenotypes.charAt(i) === 'Z') {
                tempSireGenotypes += sireGenotypes.charAt(i);
            } else if (sireGenotypes.charCodeAt(i) < 97) {
                tempSireGenotypes += String.fromCharCode(65 + k);
            }else{
                tempSireGenotypes += String.fromCharCode(97 + k);
            }
        }else{
            tempSireGenotypes += sireGenotypes.charAt(i);
        }
        if (sireGenotypes.charAt(i+1) !== String.fromCharCode(65 +k) || sireGenotypes.charAt(i+1) !== String.fromCharCode(97 + k)) {
            if (sireGenotypes.charAt(i+1) === 'Z') {
                tempSireGenotypes += sireGenotypes.charAt(i+1);
            } else if (sireGenotypes.charCodeAt(i+1) < 97) {
                tempSireGenotypes += String.fromCharCode(65 + k);
            }else{
                tempSireGenotypes += String.fromCharCode(97 + k);
            }
        }else{
            tempSireGenotypes += sireGenotypes.charAt(i+1);
        }
    }
    sireGenotypes = tempSireGenotypes;
    damTests = combinedTests;
    sireTests = combinedTests;
    // Add the DermaGenotypes back if needed
    if (damDermaGenotypes) {
        damGenotypes += damDermaGenotypes;
        sireGenotypes += sireDermaGenotypes;
    }

    numTests = combinedTests.length;
    return {damGenotypes, sireGenotypes, damTests, sireTests, numTests, testInheritances};
}


// function to deal with when a dog is selected from the users account
function DiseaseDogSelect(SelectID, gender, selectAll) {


  // Checking all boxes for selected dog, if "Select Sire/Dam" was chosen
  if(selectAll) {
      // Check to see if we are clicking on an already selected dog and just clear if we are
        if (SelectID.value === "Unselect") {
            UnselectDog(gender);
            return;
        }
      document.querySelectorAll("[id^=" + SelectID.id + "]").forEach(function (element) {
          let myRegEx = new RegExp(SelectID.id + 'ID');
          if (element.id.match(myRegEx)) {
              element.checked = true;
          }
      });
  }

  // Prevent the user from having 2 dogs of the same gender selected
    if (gender === 'user-dam') {
        document.querySelectorAll(".user-dam").forEach(function (element){
            if (element.value === "Unselect" && element.id !== SelectID.id) {
                clearCard(element, gender);
            }
        });
    }
    if (gender === 'user-sire') {
        document.querySelectorAll(".user-sire").forEach(function (element){
            if (element.value === "Unselect" && element.id !== SelectID.id) {
                clearCard(element, gender);
            }
        });
    }

    // Now select the current choice
  SelectID.value = "Unselect";
  SelectID.style.backgroundColor = "#dc5250"

    // If both dam and sire are selected, remove all other dogs until cleared or unselected
    if (gender === 'user-sire') {
        document.querySelectorAll(".user-dam").forEach(function (element) {
           if (element.value === "Unselect") {
               // Means one of each is selected, so call the function to hide the others
               hideCards(SelectID, element);
           }
        });
    }
    if (gender === 'user-dam') {
        document.querySelectorAll(".user-sire").forEach(function (element) {
           if (element.value === "Unselect") {
               // Means one of each is selected, so call the function to hide the others
               hideCards(SelectID, element);
           }
        });
    }
}

// Function to clear just one card, useful when switching dogs
function clearCard(id, gender) {
    if (gender === 'user-dam') {
        id.value = "Select Dam";
    } else {
        id.value = "Select Sire";
    }
    id.style.backgroundColor = "#1d5eae"
    // Undo any checkboxes that were checked
    document.querySelectorAll("[id^=" + id.id + 'ID' + "]").forEach(function (chkbox) {
        chkbox.checked = false;
    });
}

function hideCards(id1, id2) {
    // Function to hide cards except for the 2 dogs selected
    const cardID1 = document.getElementById(id1.id + "Card");
    const cardID2 = document.getElementById(id2.id + "Card");
    document.querySelectorAll(".card").forEach(function (element) {
        if (element.id === cardID1.id || element.id === cardID2.id) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
            // If any other checkboxes were accidentally  checked, clear them so they aren't included
            const chkboxID = element.id.replace('Card', 'ID');
            document.querySelectorAll("[id^=" + chkboxID + "]").forEach(function (chkbox) {
                chkbox.checked = false;
            });
        }
    });
}

function showCards() {
    document.querySelectorAll(".card").forEach(function (element) {
        element.style.display = 'block';
    });
}

// Function to show all genotypes for user tests instead of waiting for them to be selected
function showDiseaseGenotypes() {
    document.querySelectorAll("[id$='lbl']").forEach(function (element) {
        let elementParentID = element.id.replace(/lbl$/, "");
        let elementParent = document.getElementById(elementParentID);
        let genotype = elementParent.dataset.genotype;
        if (genotype) {
          let chkboxLbl = document.getElementById(element.id);
          if (!chkboxLbl.innerText.includes(genotype)) {
              chkboxLbl.innerText += " - " + genotype;
          }
      }
    });
}

// Function to do the same, but for coat color which requires extra transliteration
function showCoatGenotypes() {
    document.querySelectorAll("[id$='lbl']").forEach(function (element) {
        let elementParentID = element.id.replace("lbl", "");
        let elementParent = document.getElementById(elementParentID);
        let genotype = elementParent.dataset.genotype;
        if (genotype) {
            genotype = genotype.replace(/(\w)(\w)/g, "$1/$2");
            const translated = transliterate(genotype);
            let chkboxLbl = document.getElementById(element.id);
            if (!chkboxLbl.innerText.includes(translated)) {
                chkboxLbl.innerText += " - " + translated;
          }
      }
    });
}