% A class file to typeset BEng, BSc, MEng, MMath and taught MSc
% project reports in the Department of Computer Science at 
% Lancaster University Leipzig

% Many thanks to Jeremy for the base class from which this was derived.

% History
%
% Version 1
%
% 2004Apr27  Initial version
% 2004May10  Generation of list of tables and figures removed
% 2004Dec08  Minor fixes to error messages
% 2005Feb02  Package pdfcprot replaced by microtype 
% 2005Apr12  dedication and acknowledgements now come after abstract
% 2005Jul27  added option `sc' to `mathpazo' package & `textcomp' package
% 2005Aug31  added packages for Helvetica and Courier fonts
%
% Version 2 created, not backward compatible with Version 1
%
% 2006Mar23  moved front matter generation from \AtBeginDocument to
%            separately called \maketitle
% 2006Mar23  added options for choice of citation style
% 2006May12  improved communication with type area calculation
% 2006Jul03  added hypcap package
% 2006Dec10  added fixltx2e package
% 2007May31  fixed autoref names
% 2007Nov01  fixed Masters title names
% 2007Nov12  Added old-style text figures.
% 2008Oct03  used hyperref option `pdfusetitle'
% 2008Oct27  removed page numbers from `Part' pages
% 2009Jun26  changed to IEEE trans style; removed options.
% 2021Apr26  updated to BUV style and referencing
% 2022Oct05  updated to LUL style and referencing


\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{LULCSProject}[2022/10/05 James Stovold]

% Koma-script report style
\PassOptionsToPackage{twoside}{typearea}

%twoside,
\LoadClass[12pt,a4paper,BCOR13mm,DIVcalc,abstracton,pointlessnumbers]{scrreprt}

\RequirePackage[T1]{fontenc} % prevents < in text mode turning into
\RequirePackage{textcomp}    % ?', etc
%\RequirePackage[osf]{mathpazo} % Palatino font
\RequirePackage{courier} % nicer typewriter-style fonts
\RequirePackage[scaled=.9]{helvet} % nice san serif fonts
\RequirePackage{microtype} % micro-typographical extensions for
                           % pdf(e)(la)tex
\RequirePackage[british]{babel} % British hyphenation patterns, etc.
\RequirePackage{fixltx2e}
\RequirePackage{ifthen}

\pagestyle{headings}
\renewcommand{\partpagestyle}{empty}

% Reference control
%\RequirePackage[numbers,sort&compress,square,comma]{natbib}
\RequirePackage[sort&compress,comma]{natbib}
\bibliographystyle{agsm}

\typearea[current]{calc} % force page layout recalculation after
                         % changing all the fonts

\newcommand*{\LULCSP@mk@degree}[1]{%
  \expandafter\def\csname#1\endcsname{\newcommand*{\LULCSP@degree}{#1}}%
}

\LULCSP@mk@degree{BEng}
%\LULCSP@mk@degree{BSc}
\LULCSP@mk@degree{MEng}
\LULCSP@mk@degree{MMath}
\newcommand*{\SWE}{\newcommand*{\LULCSP@degree}{MSc~in~Software~Engineering}}

%\newcommand*{\BSc}{\newcommand*{\LULCSP@degree}{MSc~in~Software~Engineering}}

\newcommand*{\wordcount}[1]{\newcommand*{\LULCSP@wordcount}{#1}}
\newcommand*{\includes}[1]{\renewcommand*{\LULCSP@includes}{#1}}
\newcommand*{\LULCSP@includes}{}
\newcommand*{\excludes}[1]{\renewcommand*{\LULCSP@excludes}{#1}}
\newcommand*{\LULCSP@excludes}{}
\newcommand*{\supervisor}[1]{\newcommand*{\LULCSP@supervisor}{#1}}

\date{\fbox{\Huge DRAFT PROCESSED \today}}

\titlehead{Lancaster University Leipzig\hfill School of Computing and Communications} 

%\subject{%
  % \ifx\LULCSP@degree\undefined%
  %   \ClassError{LULCSProject}%
  %              {degree scheme not set}
  %              {Declare the degree scheme in the preamble using
  %              \protect\BEng, \protect\MEng, etc.}
  % \else%
  %   \large Submitted in part fulfilment for the degree of
  %   \LULCSP@degree.%
  % \fi%
%}

\publishers{%
  \large

  \ifx\LULCSP@supervisor\undefined%
    \ClassError{LULCSProject}%
               {supervisor not set}
               {Declare the supervisor in the preamble using \protect\supervisor{Name}}  
  \else%
    Supervisor: \LULCSP@supervisor%
  \fi%

  \vspace{1cm}
  
  % \ifx\LULCSP@degree\undefined%
  %   \ClassError{LULCSProject}%
  %              {degree scheme not set}
  %              {Declare the degree scheme in the preamble using
  %              \protect\BEng, \protect\MEng, etc.}
  %            \else%
  {\large B.Sc. (Hons) Computer Science}
  %   \large Submitted in part fulfilment for the degree of
  %   \LULCSP@degree.%
  % \fi%

  \vspace{\fill}

  \ifx\LULCSP@wordcount\undefined%
    \ClassError{LULCSProject}%
    {wordcount not set}
    {Declare the word count in the preamble using \protect\wordcount{Numeral}.} %
  \else
    
    Number of words = \LULCSP@wordcount %. as counted by \textsf{detex~report.tex~|~wc~-w}.
  \fi

  This includes the body of the report%
  \ifthenelse{    \equal{\LULCSP@includes}{\@empty}
    \and\equal{\LULCSP@excludes}{\@empty}}
  {\ only}
  {\ifthenelse{\equal{\LULCSP@includes}{\@empty}}%
    {}%
    {, and \LULCSP@includes}%
    \ifthenelse{\equal{\LULCSP@excludes}{\@empty}}%
    {}%
    {, but not \LULCSP@excludes}%
  }%
  %.%
}

\let\old@abstract\abstract
\let\endold@abstract\endabstract
\renewcommand{\abstract}[1]{\newcommand{\LULCSP@abstract}{#1}}
\renewcommand{\endabstract}{}

\let\old@dedication\dedication
\newcommand*{\LULCSP@dedication}{}
\renewcommand*{\dedication}[1]{\renewcommand*{\LULCSP@dedication}{#1}}
\newif\ifacknowledgements
\acknowledgementsfalse
\newcommand*{\LULCSP@acknowledgements}{}
\newcommand{\acknowledgements}[1]{%
  \renewcommand{\LULCSP@acknowledgements}{#1}%
  \acknowledgementstrue
}

\newcommand*{\declaration}[1]{\newcommand*{\LULCSP@declaration}{#1}}



\InputIfFileExists{\jobname.ldf}{}

\RequirePackage[pdfusetitle]{hyperref}% automatic hyperlinks, etc
\RequirePackage[all]{hypcap}% improve link placement in floats
\hypersetup{%
  pdfstartview={Fit}%
}
\urlstyle{sf}
\renewcommand*{\Itemautorefname}{Item}
\renewcommand*{\chapterautorefname}{Chapter}
\renewcommand*{\sectionautorefname}{Section}
\renewcommand*{\subsectionautorefname}{Subsection}
\renewcommand*{\subsubsectionautorefname}{Subsubsection}
\renewcommand*{\paragraphautorefname}{Paragraph}
\renewcommand*{\Hfootnoteautorefname}{Footnote}
%\renewcommand*{\pageautorefname}{Page}

\let\old@maketitle=\maketitle
\renewcommand*{\maketitle}{%
  \old@maketitle%
  \clearpage{}%
  \pagestyle{empty}%
  \ifx\LULCSP@declaration\undefined%
    \ClassError{LULCSProject}%
    {declaration not set}
    {You must include a declaration in the preamble using \protect\declaration{Declaration}.}%
  \else%
    \paragraph{{\large Declaration of Originality}}%
    \mbox{}%
    \newline%
    \newline%
    \LULCSP@declaration%
  \fi%
  \ifx\LULCSP@abstract\undefined%
    \ClassError% something
    {LULCSProject}%
    {No abstract!}%
    {Declare an abstract in the preamble using \protect\abstract{Text}.}
  \else%
    \begin{old@abstract}% 
      \LULCSP@abstract%
    \end{old@abstract}%
  \fi%
  % dedication & acknowledgements
  \ifthenelse%
  {\equal{\LULCSP@dedication}{\@empty}
         \and\equal{\LULCSP@acknowledgements}{\@empty}}
  {}{
    \cleardoublepage%
    \thispagestyle{empty}
    \vspace*{\fill}%
    %
    \ifthenelse{\equal{\LULCSP@dedication}{\@empty}}%
    {}%
    { \begin{center}%
        \large\LULCSP@dedication%
      \end{center}%
    }%
    %
    \ifacknowledgements%
    { \vfill%
      \normalsize%
      \begin{center}%
        \large\bfseries Acknowledgements%
      \end{center}%
      \LULCSP@acknowledgements%
    }%
    \fi%
    \vspace*{\fill}%
  }%
  \cleardoublepage%
  \microtypesetup{protrusion=false}%
  \tableofcontents%  
  \microtypesetup{protrusion=true}%
}

\AtBeginDocument{%
  \nonfrenchspacing%
}
\usepackage[top=2cm,bottom=3cm,left=2.5cm,right=2.5cm]{geometry}
